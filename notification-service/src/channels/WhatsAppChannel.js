/**
 * Canal WhatsApp via whatsapp-web.js (QR scan — PAS l'API officielle Meta).
 * Expose statut + QR (data URL) pour le dashboard admin.
 */
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

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

    const puppeteerOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--js-flags=--max-old-space-size=256',
        '--single-process',
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
      // Terminal QR optionnel (bruyant) — le dashboard utilise qrDataUrl
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
    // CD/CG souvent saisis en 0XXXXXXXXX → préfixe 243
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      digits = `243${digits.slice(1)}`;
    }
    return digits;
  }

  async send(to, body) {
    if (!this.enabled) {
      return { ok: true, skipped: true, reason: 'whatsapp_disabled' };
    }
    if (!this.client || !this.ready) {
      throw new Error('WhatsApp non prêt — Admin → WhatsApp → scannez le QR');
    }
    const digits = this.normalizePhone(to);
    let chatId = `${digits}@c.us`;
    try {
      const numberId = await this.client.getNumberId(digits);
      if (numberId?._serialized) chatId = numberId._serialized;
      else throw new Error(`Numéro non WhatsApp: +${digits}`);
    } catch (err) {
      if (String(err.message || '').includes('non WhatsApp')) throw err;
      // fallback chatId classique
    }
    const result = await this.client.sendMessage(chatId, body);
    this.pushLog('info', `envoyé → ${maskPhone(to)} (${chatId})`);
    return { ok: true, id: result?.id?._serialized || null };
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

function maskPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 6) return '***';
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}
