import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { debugLog } from './debugLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bridge Express ↔ worker whatsapp-web.js (processus séparé).
 */
export class WhatsAppBridge {
  constructor() {
    this.child = null;
    this.pending = new Map();
    this.restartCount = 0;
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
      console.warn('[whatsapp-bridge] désactivé (WHATSAPP_ENABLED=false)');
      return;
    }
    if (this.child) return;

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
        if (msg.data.ready) this.restartCount = 0;
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.ok) resolve(msg.data);
        else reject(new Error(msg.error || 'whatsapp worker error'));
      }
    });

    this.child.on('error', (err) => {
      console.error(`[whatsapp-bridge] worker IPC error: ${err.message}`);
    });

    this.child.on('exit', (code) => {
      console.warn(`[whatsapp-bridge] worker exit code=${code}`);
      for (const { reject } of this.pending.values()) {
        reject(new Error(`WhatsApp worker arrêté (code ${code})`));
      }
      this.pending.clear();
      this.cachedStatus = {
        ...this.cachedStatus,
        ready: false,
        state: 'disconnected',
        lastError: `worker exit ${code}`,
        qrDataUrl: null,
      };
      this.child = null;
      // Queue persistante + readiness permettent une reprise contrôlée sans
      // laisser l'API afficher une fausse disponibilité WhatsApp.
      this.restartCount += 1;
      const retryDelayMs = Math.min(10000 * 2 ** Math.min(this.restartCount - 1, 3), 60000);
      console.warn(
        `[whatsapp-bridge] redémarrage dans ${retryDelayMs / 1000}s (tentative ${this.restartCount})`
      );
      setTimeout(() => this.start(), retryDelayMs);
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
        // #region agent log
        debugLog(
          'whatsappBridge.js:call',
          'worker IPC timeout',
          { type, timeoutMs },
          'H3',
          (line) => console.warn(line)
        );
        // #endregion
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
      this.child.send({ id, type, ...payload }, (err) => {
        if (!err || !this.pending.has(id)) return;
        this.pending.delete(id);
        clearTimeout(timer);
        reject(new Error(`WhatsApp worker IPC impossible: ${err.message}`));
      });
    });
  }

  reconnect() {
    return this.call('reconnect');
  }

  logout() {
    return this.call('logout');
  }

  /** Stop the child process without calling WhatsApp logout, preserving LocalAuth on /data. */
  stop() {
    if (this.child && !this.child.killed) {
      this.child.kill('SIGTERM');
    }
  }

  async send(to, body) {
    // Sync LID + ACK serveur peut dépasser 60s sur Railway
    return this.call('send', { to, body }, 120000);
  }
}
