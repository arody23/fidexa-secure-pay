import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bridge Express ↔ worker whatsapp-web.js (processus séparé).
 */
export class WhatsAppBridge {
  constructor() {
    this.child = null;
    this.pending = new Map();
    this.cachedStatus = {
      engine: 'whatsapp-web.js',
      officialApi: false,
      enabled: process.env.WHATSAPP_ENABLED !== 'false',
      ready: false,
      state: 'starting',
      hasQr: false,
      qrUpdatedAt: null,
      qrDataUrl: null,
      info: null,
      lastError: null,
      recentEvents: [],
      settings: {},
    };
  }

  start() {
    if (process.env.WHATSAPP_ENABLED === 'false') {
      this.cachedStatus.state = 'disabled';
      this.cachedStatus.enabled = false;
      return;
    }
    const workerPath = path.join(__dirname, '..', 'whatsapp-worker.js');
    this.child = fork(workerPath, [], {
      cwd: path.join(__dirname, '..', '..'),
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });

    this.child.on('message', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'status' && msg.data) {
        this.cachedStatus = msg.data;
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.ok) resolve(msg.data);
        else reject(new Error(msg.error || 'whatsapp worker error'));
      }
    });

    this.child.on('exit', (code) => {
      console.warn(`[whatsapp-bridge] worker exit code=${code}`);
      this.cachedStatus = {
        ...this.cachedStatus,
        ready: false,
        state: 'disconnected',
        lastError: `worker exit ${code}`,
        qrDataUrl: null,
      };
      this.child = null;
      // auto-restart
      setTimeout(() => this.start(), 3000);
    });
  }

  adminStatus() {
    return this.cachedStatus;
  }

  status() {
    return {
      enabled: this.cachedStatus.enabled,
      ready: this.cachedStatus.ready,
      state: this.cachedStatus.state,
    };
  }

  call(type, payload = {}, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      if (!this.child || !this.child.connected) {
        reject(new Error('WhatsApp worker non démarré'));
        return;
      }
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`WhatsApp worker timeout (${type})`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.child.send({ id, type, ...payload });
    });
  }

  reconnect() {
    return this.call('reconnect');
  }

  logout() {
    return this.call('logout');
  }

  async send(to, body) {
    return this.call('send', { to, body });
  }
}
