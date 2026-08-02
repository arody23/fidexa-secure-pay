/**
 * Canal WhatsApp via whatsapp-web.js (QR scan — PAS l'API officielle Meta).
 * Expose statut + QR (data URL) pour le dashboard admin.
 */
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

/** ack: -1 erreur, 0 pending, 1 serveur, 2 délivré, 3 lu */
const ACK_SERVER = 1;

export class WhatsAppChannel {
  constructor() {
    this.enabled = process.env.WHATSAPP_ENABLED !== 'false';
    this.ready = false;
    this.client = null;
    this.latestQr = null;
    this.latestQrDataUrl = null;
    this.qrUpdatedAt = null;
    this.lastError = null;
    this.state = 'idle'; // idle | initializing | qr | authenticated | ready | disconnected | disabled
    this.info = null;
    this.eventLog = [];
  }

  pushLog(level, message) {
    const entry = { at: new Date().toISOString(), level, message };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 200) this.eventLog.length = 200;
    const line = `[whatsapp-web.js] ${message}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }

  async init() {
    if (!this.enabled) {
      this.state = 'disabled';
      this.pushLog('warn', 'désactivé (WHATSAPP_ENABLED=false)');
      return;
    }
    if (this.client) return;
    await this._startClient();
  }

  async _startClient() {
    this.state = 'initializing';
    this.ready = false;
    this.latestQr = null;
    this.latestQrDataUrl = null;
    this.lastError = null;

    const chromePath =
      process.env.CHROME_PATH ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : undefined);

    // Ne PAS utiliser --single-process : Chromium zombie → sendMessage résout sans sync serveur.
    const puppeteerOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    };
    if (chromePath) puppeteerOpts.executablePath = chromePath;

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth',
      }),
      puppeteer: puppeteerOpts,
    });

    this.client.on('qr', async (qr) => {
      this.state = 'qr';
      this.ready = false;
      this.latestQr = qr;
      this.qrUpdatedAt = new Date().toISOString();
      try {
        this.latestQrDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          width: 320,
          errorCorrectionLevel: 'M',
        });
      } catch (err) {
        this.latestQrDataUrl = null;
        this.pushLog('error', `QR image failed: ${err.message}`);
      }
      this.pushLog('info', 'QR prêt — scannez depuis Admin → WhatsApp');
      if (process.env.WHATSAPP_TERMINAL_QR === 'true') {
        qrcodeTerminal.generate(qr, { small: true });
      }
    });

    this.client.on('authenticated', () => {
      this.state = 'authenticated';
      this.latestQr = null;
      this.latestQrDataUrl = null;
      this.pushLog('info', 'authentifié (session WhatsApp Web)');
    });

    this.client.on('ready', async () => {
      this.ready = true;
      this.state = 'ready';
      this.latestQr = null;
      this.latestQrDataUrl = null;
      try {
        const info = this.client.info;
        this.info = {
          wid: info?.wid?.user || null,
          pushname: info?.pushname || null,
          platform: info?.platform || null,
        };
      } catch {
        this.info = null;
      }
      this.pushLog('info', `prêt${this.info?.wid ? ` (+${this.info.wid})` : ''}`);
    });

    this.client.on('auth_failure', (msg) => {
      this.ready = false;
      this.state = 'disconnected';
      this.lastError = String(msg || 'auth_failure');
      this.pushLog('error', `auth_failure: ${this.lastError}`);
    });

    this.client.on('disconnected', (reason) => {
      this.ready = false;
      this.state = 'disconnected';
      this.info = null;
      this.lastError = String(reason || 'disconnected');
      this.pushLog('warn', `disconnected: ${this.lastError}`);
    });

    this.pushLog('info', 'démarrage whatsapp-web.js…');
    await this.client.initialize();
  }

  async reconnect() {
    this.pushLog('info', 'reconnexion demandée (nouveau QR)');
    await this.logout(false);
    await this._startClient();
    return this.adminStatus();
  }

  async logout(destroyOnly = true) {
    try {
      if (this.client) {
        try {
          await this.client.logout();
        } catch {
          /* ignore */
        }
        try {
          await this.client.destroy();
        } catch {
          /* ignore */
        }
      }
    } finally {
      this.client = null;
      this.ready = false;
      this.state = destroyOnly ? 'disconnected' : 'idle';
      this.info = null;
      this.latestQr = null;
      this.latestQrDataUrl = null;
      this.pushLog('info', 'session fermée');
    }
  }

  normalizePhone(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) throw new Error('Numéro WhatsApp invalide');
    if (digits.startsWith('00')) digits = digits.slice(2);
    // CD souvent saisi en 0XXXXXXXXX → préfixe 243
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      digits = `243${digits.slice(1)}`;
    }
    return digits;
  }

  formatE164(digits) {
    return `+${String(digits || '').replace(/\D/g, '')}`;
  }

  /**
   * Résout le JID WhatsApp réel (@lid prioritaire si renvoyé par WA).
   * @returns {Promise<string[]>} candidats ordonnés
   */
  async resolveChatIds(digits) {
    const cUs = `${digits}@c.us`;
    const ids = [];

    try {
      const numberId = await this.client.getNumberId(digits);
      const serialized =
        numberId?._serialized ||
        (numberId?.user && numberId?.server
          ? `${numberId.user}@${numberId.server}`
          : null);
      if (serialized) {
        ids.push(serialized);
        this.pushLog('info', `numéro résolu ${this.formatE164(digits)} → ${serialized}`);
      } else {
        this.pushLog('warn', `getNumberId: aucun compte WhatsApp pour ${this.formatE164(digits)}`);
      }
    } catch (err) {
      this.pushLog('warn', `getNumberId échec: ${err instanceof Error ? err.message : err}`);
    }

    if (!ids.includes(cUs)) ids.push(cUs);
    return ids;
  }

  /** Ouvre / crée le chat côté WhatsApp Web avant l'envoi (nouveaux contacts). */
  async ensureChatOpen(chatId) {
    try {
      const chat = await this.client.getChatById(chatId);
      if (chat) return chat;
    } catch {
      /* continue */
    }
    try {
      if (typeof this.client.interface?.openChatWindow === 'function') {
        await this.client.interface.openChatWindow(chatId);
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      this.pushLog('warn', `openChatWindow(${chatId}): ${err instanceof Error ? err.message : err}`);
    }
    try {
      return await this.client.getChatById(chatId);
    } catch {
      return null;
    }
  }

  waitForAck(message, minAck = ACK_SERVER, timeoutMs = 25000) {
    if (!message) return Promise.resolve(-1);
    if (typeof message.ack === 'number' && message.ack >= minAck) {
      return Promise.resolve(message.ack);
    }
    const targetId = message.id?._serialized;
    return new Promise((resolve) => {
      let settled = false;
      const done = (ack) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          this.client?.removeListener?.('message_ack', onAck);
        } catch {
          /* ignore */
        }
        resolve(ack);
      };
      const onAck = (msg, ack) => {
        const id = msg?.id?._serialized;
        if (targetId && id && id !== targetId) return;
        if (ack >= minAck) done(ack);
      };
      const timer = setTimeout(
        () => done(typeof message.ack === 'number' ? message.ack : 0),
        timeoutMs
      );
      this.client?.on?.('message_ack', onAck);
    });
  }

  async send(to, body) {
    if (!this.enabled) {
      return { ok: true, skipped: true, reason: 'whatsapp_disabled' };
    }
    if (!this.client || !this.ready) {
      throw new Error('WhatsApp non prêt — Admin → WhatsApp → scannez le QR');
    }
    if (!body || !String(body).trim()) {
      throw new Error('Message WhatsApp vide');
    }

    const digits = this.normalizePhone(to);
    const e164 = this.formatE164(digits);
    const selfWid = this.info?.wid || this.client.info?.wid?.user || null;
    if (selfWid && digits === String(selfWid).replace(/\D/g, '')) {
      this.pushLog('info', `envoi vers soi-même (${e164}) — chat « Message à vous-même »`);
    }

    const candidates = await this.resolveChatIds(digits);
    if (!candidates.length) {
      throw new Error(`Numéro non WhatsApp: ${e164}`);
    }

    const errors = [];

    for (const chatId of candidates) {
      try {
        await this.ensureChatOpen(chatId);

        // waitUntilMsgSent: sans ça, wwebjs ≥1.33 peut résoudre avant l'ACK serveur
        // (voire renvoyer null si getChat échoue) → faux « envoyé ».
        const result = await this.client.sendMessage(chatId, body, {
          waitUntilMsgSent: true,
          sendSeen: false,
          linkPreview: false,
        });

        if (!result || !result.id) {
          throw new Error(`sendMessage a renvoyé null (chat non résolu: ${chatId})`);
        }

        const ack = await this.waitForAck(result, ACK_SERVER, 25000);
        const mid = result.id?._serialized || null;

        if (ack < ACK_SERVER) {
          throw new Error(
            `WhatsApp n'a pas accepté le message (ack=${ack}, attendu≥${ACK_SERVER}) via ${chatId}`
          );
        }

        this.pushLog('info', `envoyé → ${e164} (${chatId}) ack=${ack} id=${mid}`);
        return { ok: true, id: mid, to: e164, chatId, ack };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${chatId}: ${msg}`);
        this.pushLog('warn', `échec envoi ${chatId}: ${msg}`);
      }
    }

    const detail = errors.join(' | ');
    this.pushLog('error', `échec total → ${e164}: ${detail}`);
    throw new Error(`Envoi WhatsApp échoué pour ${e164}: ${detail}`);
  }

  status() {
    return { enabled: this.enabled, ready: this.ready, state: this.state };
  }

  adminStatus() {
    return {
      engine: 'whatsapp-web.js',
      officialApi: false,
      enabled: this.enabled,
      ready: this.ready,
      state: this.state,
      hasQr: !!this.latestQrDataUrl,
      qrUpdatedAt: this.qrUpdatedAt,
      qrDataUrl: this.latestQrDataUrl,
      info: this.info,
      lastError: this.lastError,
      recentEvents: this.eventLog.slice(0, 50),
      settings: {
        port: process.env.PORT || '3099',
        whatsappEnabled: this.enabled,
        otpTtlMinutes: process.env.OTP_TTL_MINUTES || '15',
        orderSessionDays: process.env.ORDER_SESSION_DAYS || '7',
        appPublicUrl: process.env.APP_PUBLIC_URL || null,
        authPath: process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth',
        chromePath:
          process.env.CHROME_PATH ||
          process.env.PUPPETEER_EXECUTABLE_PATH ||
          (process.platform === 'win32' ? 'Chrome Windows' : 'Chromium (Docker/Railway)'),
      },
    };
  }
}
