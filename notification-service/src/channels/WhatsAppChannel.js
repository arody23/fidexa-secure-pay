/**
 * Canal WhatsApp via whatsapp-web.js (QR scan — PAS l'API officielle Meta).
 * Expose statut + QR (data URL) pour le dashboard admin.
 */
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
import { debugLog } from '../lib/debugLog.js';

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

    this.client.on('message_ack', (message, ack) => {
      // #region agent log
      debugLog(
        'WhatsAppChannel.js:message_ack',
        'WhatsApp ACK event received',
        {
          ack,
          server: message?.id?.server || null,
          hasMessageKey: Boolean(message?.id?.id),
        },
        'H2',
        (line, data) => this.pushLog('info', `${line} ${JSON.stringify(data)}`)
      );
      // #endregion
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
   * Crée / résout le chat WhatsApp (LID) — getChat natif de wwebjs échoue souvent
   * sur les contacts sans historique (« No LID » / sendMessage → null).
   */
  async resolveChatForSend(digits) {
    if (!this.client?.pupPage) {
      throw new Error('Session WhatsApp Web non prête (pupPage manquant)');
    }

    const result = await this.client.pupPage.evaluate(async (phone) => {
      const cUs = `${phone}@c.us`;
      const WidFactory = window.require('WAWebWidFactory');
      const FindChat = window.require('WAWebFindChatAction');
      const ChatCol = window.require('WAWebCollections').Chat;
      const errors = [];

      const toId = (w) => {
        if (!w) return null;
        if (typeof w === 'string') return w;
        if (w._serialized) return w._serialized;
        if (w.user && w.server) return `${w.user}@${w.server}`;
        return null;
      };

      const tryFind = async (id) => {
        if (!id) return null;
        const wid = WidFactory.createWid(id);
        const cached = ChatCol.get(wid);
        if (cached?.id) return toId(cached.id);

        const flows = ['newChatFlow', 'createChat', undefined];
        for (const flow of flows) {
          try {
            const res = flow
              ? await FindChat.findOrCreateLatestChat(wid, flow)
              : await FindChat.findOrCreateLatestChat(wid);
            if (res?.chat?.id) return toId(res.chat.id);
          } catch (e) {
            errors.push(`find(${id},${flow || 'default'}): ${e?.message || e}`);
          }
        }
        return null;
      };

      // 1) Mapper PN ↔ LID dans le store WhatsApp
      try {
        if (window.WWebJS?.enforceLidAndPnRetrieval) {
          await window.WWebJS.enforceLidAndPnRetrieval(cUs);
        }
      } catch (e) {
        errors.push(`enforceLid: ${e?.message || e}`);
      }

      let lidId = null;
      let pnId = cUs;

      // 2) queryWidExists (souvent renvoie @lid)
      try {
        const exists = await window
          .require('WAWebQueryExistsJob')
          .queryWidExists(WidFactory.createWid(cUs));
        if (exists?.wid) lidId = toId(exists.wid);
      } catch (e) {
        errors.push(`queryExists: ${e?.message || e}`);
      }

      // 3) Contact sync (nouveaux contacts sans chat)
      try {
        const actions = [{ type: 'add', phoneNumber: String(phone) }];
        const query = window
          .require('WAWebContactSyncUtils')
          .constructUsyncDeltaQuery(actions);
        const sync = await query.execute();
        const lid = sync?.list?.[0]?.lid;
        if (lid) {
          const synced = toId(lid);
          if (synced) lidId = synced;
          else if (typeof lid === 'string') {
            lidId = lid.includes('@') ? lid : `${lid}@lid`;
          }
        }
      } catch (e) {
        errors.push(`contactSync: ${e?.message || e}`);
      }

      // 4) Relire le mapping après sync
      try {
        if (window.WWebJS?.enforceLidAndPnRetrieval) {
          const map = await window.WWebJS.enforceLidAndPnRetrieval(cUs);
          if (map?.lid) lidId = toId(map.lid) || lidId;
          if (map?.phone) pnId = toId(map.phone) || pnId;
        }
      } catch (e) {
        errors.push(`enforceLid2: ${e?.message || e}`);
      }

      // Collecter tous les chats résolus — l'envoi @lid renvoie souvent msg_null
      const found = [];
      const candidates = [cUs, pnId, lidId].filter(Boolean);
      const seen = new Set();
      for (const id of candidates) {
        if (seen.has(id)) continue;
        seen.add(id);
        const chatId = await tryFind(id);
        if (chatId && !found.includes(chatId)) found.push(chatId);
      }

      const preferred =
        found.find((id) => id.endsWith('@c.us')) ||
        found.find((id) => !id.endsWith('@lid')) ||
        found[0] ||
        null;

      if (preferred) {
        return { ok: true, chatId: preferred, allChatIds: found, candidates, errors };
      }

      return { ok: false, candidates, errors };
    }, digits);

    if (result?.errors?.length) {
      this.pushLog('warn', `resolveChat notes: ${result.errors.slice(0, 6).join(' | ')}`);
    }
    return result;
  }

  /** Envoi bas niveau — essaie addAndSendMsgToChat si WWebJS.sendMessage renvoie null. */
  async sendViaStore(chatId, body, opts = {}) {
    const waitUntilMsgSent = opts.waitUntilMsgSent !== false;
    return this.client.pupPage.evaluate(
      async (chatId, content, waitUntilMsgSent) => {
        const WidFactory = window.require('WAWebWidFactory');
        const FindChat = window.require('WAWebFindChatAction');
        const ChatCol = window.require('WAWebCollections').Chat;
        const SendAction = window.require('WAWebSendMsgChatAction');

        const sendOptions = {
          linkPreview: false,
          waitUntilMsgSent,
          parseVCards: true,
          mentionedJidList: [],
          ignoreQuoteErrors: true,
        };

        const resolveChat = async (id) => {
          const wid = WidFactory.createWid(id);
          let chat = ChatCol.get(wid);
          if (chat) return chat;
          for (const flow of ['newChatFlow', 'createChat', undefined]) {
            try {
              const res = flow
                ? await FindChat.findOrCreateLatestChat(wid, flow)
                : await FindChat.findOrCreateLatestChat(wid);
              if (res?.chat) return res.chat;
            } catch {
              /* next flow */
            }
          }
          return null;
        };

        const sendToChat = async (chat) => {
          let msg = await window.WWebJS.sendMessage(chat, content, sendOptions);
          if (msg) return msg;

          // Même structure que WWebJS.sendMessage. Le fallback précédent créait
          // uniquement { type, body }, ce qui cassait WAWebSendMsgChatAction
          // car message.id.remote était absent.
          const { getMaybeMeLidUser, getMaybeMePnUser } = window.require(
            'WAWebUserPrefsMeUser'
          );
          const from = chat.id.isLid()
            ? getMaybeMeLidUser()
            : getMaybeMePnUser();
          const id = await window.require('WAWebMsgKey').newId();
          const key = new (window.require('WAWebMsgKey'))({
            from,
            to: chat.id,
            id,
            selfDir: 'out',
          });
          const ephemeralFields = window
            .require('WAWebGetEphemeralFieldsMsgActionsUtils')
            .getEphemeralFields(chat);
          const message = {
            ...sendOptions,
            id: key,
            ack: 0,
            body: content,
            from,
            to: chat.id,
            local: true,
            self: 'out',
            t: Math.floor(Date.now() / 1000),
            isNewMsg: true,
            type: 'chat',
            ...ephemeralFields,
          };
          const [msgPromise, sendResultPromise] = SendAction.addAndSendMsgToChat(
            chat,
            message
          );
          msg = await msgPromise;
          if (waitUntilMsgSent) {
            try {
              await sendResultPromise;
            } catch {
              /* ignore */
            }
          }
          return msg || null;
        };

        let chat = await resolveChat(chatId);
        if (!chat) return { error: `chat_missing:${chatId}`, via: chatId };

        let msg = await sendToChat(chat);
        if (msg) {
          return { ...(window.WWebJS.getMessageModel(msg) || {}), via: chatId };
        }

        return { error: 'msg_null', via: chatId };
      },
      chatId,
      body,
      waitUntilMsgSent
    );
  }

  /** Ouvre le chat @c.us dans WhatsApp Web (aide la livraison sur nouveaux contacts). */
  async openPhoneChat(digits) {
    const cUs = `${digits}@c.us`;
    try {
      if (typeof this.client.interface?.openChatWindow === 'function') {
        await this.client.interface.openChatWindow(cUs);
      }
    } catch (err) {
      this.pushLog('warn', `openChatWindow(${cUs}): ${err instanceof Error ? err.message : err}`);
    }
  }

  buildSendTargets(digits, resolved) {
    const cUs = `${digits}@c.us`;
    const fromResolve = Array.isArray(resolved?.allChatIds) ? resolved.allChatIds : [];
    const ordered = [cUs, ...fromResolve, resolved?.chatId].filter(Boolean);
    return [...new Set(ordered)];
  }

  waitForAck(message, minAck = ACK_SERVER, timeoutMs = 25000) {
    if (!message) return Promise.resolve(-1);
    if (message.ack === -1) return Promise.resolve(-1);
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
        const sameMessageKey = Boolean(
          message?.id?.id && msg?.id?.id && message.id.id === msg.id.id
        );
        // #region agent log
        debugLog(
          'WhatsAppChannel.js:waitForAck',
          'ACK compared with sent message',
          {
            ack,
            sameSerializedId: Boolean(targetId && id && targetId === id),
            sameMessageKey,
            sentServer: message?.id?.server || null,
            ackServer: msg?.id?.server || null,
          },
          'H2',
          (line, data) => this.pushLog('info', `${line} ${JSON.stringify(data)}`)
        );
        // #endregion
        // WhatsApp may rewrite the remote JID from @c.us to @lid; the message
        // key remains stable even when _serialized changes.
        if (targetId && id && id !== targetId && !sameMessageKey) return;
        if (ack === -1) {
          done(-1);
          return;
        }
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
    // #region agent log
    debugLog(
      'WhatsAppChannel.js:send',
      'send entry',
      { cc: digits.slice(0, 3), digitLen: digits.length },
      'H5',
      (line) => this.pushLog('info', line)
    );
    // #endregion
    const selfWid = this.info?.wid || this.client.info?.wid?.user || null;
    if (selfWid && digits === String(selfWid).replace(/\D/g, '')) {
      this.pushLog('info', `envoi vers soi-même (${e164}) — chat « Message à vous-même »`);
    }

    // getNumberId peut retourner un @lid, qui confirme que le compte existe,
    // mais Client.sendMessage de whatsapp-web.js attend le JID téléphone
    // standard. Le @lid reste donc un signal de résolution, pas une cible.
    let targetId = null;
    try {
      const numberId = await this.client.getNumberId(digits);
      if (!numberId) {
        throw new Error(`Numéro non WhatsApp: ${e164}`);
      }
      const resolvedId =
        numberId._serialized ||
        (numberId.user && numberId.server ? `${numberId.user}@${numberId.server}` : null);
      if (!resolvedId) {
        throw new Error(`Identifiant WhatsApp introuvable: ${e164}`);
      }
      targetId = `${digits}@c.us`;
      this.pushLog('info', `compte WA trouvé ${e164} → ${resolvedId}; envoi via ${targetId}`);
    } catch (err) {
      if (String(err.message || '').includes('non WhatsApp')) throw err;
      throw new Error(
        `Impossible de résoudre le compte WhatsApp pour ${e164}: ${
          err instanceof Error ? err.message : err
        }`
      );
    }

    const sendStart = Date.now();
    let raw;
    try {
      raw = await this.client.sendMessage(targetId, body, {
        waitUntilMsgSent: true,
        sendSeen: false,
        linkPreview: false,
      });
    } catch (err) {
      throw new Error(
        `Envoi WhatsApp impossible pour ${e164} via ${targetId}: ${
          err instanceof Error ? err.message : err
        }`
      );
    }

    if (!raw?.id) {
      throw new Error(`Envoi WhatsApp sans identifiant pour ${e164} via ${targetId}`);
    }

    const ack = await this.waitForAck(
      raw,
      ACK_SERVER,
      25000
    );

    // #region agent log
    debugLog(
      'WhatsAppChannel.js:send',
      'after waitForAck',
      {
        ack,
        minAck: ACK_SERVER,
        via: targetId,
        sentMessageKey: raw.id?.id || null,
        sendMs: Date.now() - sendStart,
      },
      'H2',
      (line, data) => this.pushLog('info', `${line} ${JSON.stringify(data)}`)
    );
    // #endregion

    if (ack === -1) {
      throw new Error(
        `WhatsApp a rejeté le message (ack=-1) pour ${e164} via ${targetId}`
      );
    }

    if (ack < ACK_SERVER) {
      throw new Error(
        `WhatsApp n'a pas accepté le message pour ${e164} (ack=${ack}) via ${targetId}`
      );
    }

    const mid = raw.id._serialized || null;
    this.pushLog('info', `envoyé → ${e164} (${targetId}) ack=${ack} id=${mid}`);
    return { ok: true, id: mid, to: e164, chatId: targetId, ack };
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
