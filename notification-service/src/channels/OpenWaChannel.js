const READY_STATUS = 'ready';
const STATUS_REFRESH_MS = 5000;

function errorText(status, body) {
  const detail =
    body && typeof body === 'object'
      ? body.message || body.error || body.code || JSON.stringify(body)
      : String(body || '');
  return `OpenWA HTTP ${status}${detail ? `: ${detail.slice(0, 500)}` : ''}`;
}

/**
 * Adaptateur OpenWA REST. Il respecte la même interface que WhatsAppBridge,
 * afin que la queue existante ne dépende pas d'un moteur WhatsApp particulier.
 */
export class OpenWaChannel {
  constructor() {
    this.baseUrl = (process.env.OPENWA_BASE_URL || '').replace(/\/+$/, '');
    this.apiKey = process.env.OPENWA_API_KEY || '';
    this.sessionId = process.env.OPENWA_SESSION_ID || '';
    this.enabled = process.env.WHATSAPP_ENABLED !== 'false';
    this.timer = null;
    this.cachedStatus = {
      engine: 'openwa',
      officialApi: false,
      enabled: this.enabled,
      ready: false,
      state: this.enabled ? 'starting' : 'disabled',
      hasQr: false,
      qrUpdatedAt: null,
      qrDataUrl: null,
      info: null,
      lastError: null,
      recentEvents: [],
      settings: { transport: 'openwa', sessionId: this.sessionId || null },
    };
  }

  configured() {
    return Boolean(this.baseUrl && this.apiKey && this.sessionId);
  }

  pushEvent(level, message) {
    this.cachedStatus.recentEvents.unshift({ at: new Date().toISOString(), level, message });
    if (this.cachedStatus.recentEvents.length > 50) this.cachedStatus.recentEvents.length = 50;
    if (level === 'error') console.error(`[openwa] ${message}`);
    else if (level === 'warn') console.warn(`[openwa] ${message}`);
    else console.log(`[openwa] ${message}`);
  }

  async request(path, options = {}) {
    if (!this.configured()) {
      throw new Error('OpenWA non configuré (OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID requis)');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-Key': this.apiKey,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (!response.ok) throw new Error(errorText(response.status, body));
      return body;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('OpenWA timeout');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  applySession(session, qr = null) {
    const state = session?.status || 'disconnected';
    const ready = state === READY_STATUS;
    this.cachedStatus = {
      ...this.cachedStatus,
      enabled: this.enabled,
      ready,
      state,
      hasQr: Boolean(qr?.qrCode),
      qrUpdatedAt: qr?.qrCode ? new Date().toISOString() : null,
      qrDataUrl: qr?.qrCode || null,
      info: session?.phone
        ? { wid: session.phone, pushname: session.pushName || null, platform: 'openwa' }
        : null,
      lastError: session?.lastError || null,
    };
  }

  async refreshStatus() {
    if (!this.enabled) return this.cachedStatus;
    try {
      const session = await this.request(`/api/sessions/${encodeURIComponent(this.sessionId)}`);
      let qr = null;
      if (session?.status === 'qr_ready') {
        try {
          qr = await this.request(`/api/sessions/${encodeURIComponent(this.sessionId)}/qr`);
        } catch {
          // Le QR peut expirer entre les deux appels; le prochain refresh le récupérera.
        }
      }
      this.applySession(session, qr);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.cachedStatus = {
        ...this.cachedStatus,
        ready: false,
        state: 'disconnected',
        lastError: message,
        hasQr: false,
        qrDataUrl: null,
      };
      this.pushEvent('warn', `statut indisponible: ${message}`);
    }
    return this.cachedStatus;
  }

  start() {
    if (!this.enabled) {
      this.cachedStatus = { ...this.cachedStatus, enabled: false, state: 'disabled' };
      return;
    }
    if (!this.configured()) {
      this.cachedStatus = {
        ...this.cachedStatus,
        ready: false,
        state: 'disconnected',
        lastError: 'OpenWA non configuré',
      };
      return;
    }
    void this.refreshStatus();
    if (!this.timer) {
      this.timer = setInterval(() => void this.refreshStatus(), STATUS_REFRESH_MS);
      this.timer.unref?.();
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  status() {
    return {
      enabled: this.cachedStatus.enabled,
      ready: this.cachedStatus.ready,
      state: this.cachedStatus.state,
    };
  }

  adminStatus() {
    return this.cachedStatus;
  }

  async reconnect() {
    const id = encodeURIComponent(this.sessionId);
    try {
      await this.request(`/api/sessions/${id}/start`, { method: 'POST' });
    } catch (error) {
      // Une session déjà lancée renvoie 400; récupérer son état sans la détruire.
      if (!String(error instanceof Error ? error.message : error).includes('HTTP 400')) throw error;
    }
    await this.refreshStatus();
    return this.adminStatus();
  }

  async logout() {
    const session = await this.request(`/api/sessions/${encodeURIComponent(this.sessionId)}/logout`, {
      method: 'POST',
    });
    this.applySession(session);
    return this.adminStatus();
  }

  normalizePhone(phone) {
    const candidates = this.phoneCandidates(phone);
    if (!candidates.length) throw new Error('Numéro WhatsApp invalide');
    return candidates[0];
  }

  /**
   * Congo (+242/+243) profiles often keep a trunk 0 after the country code.
   * OpenWA empirically resolves some chats as 2420… but not 242… — try both.
   */
  phoneCandidates(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    if (digits.startsWith('00')) digits = digits.slice(2);

    const out = [];
    const push = (value) => {
      if (value && value.length >= 9 && !out.includes(value)) out.push(value);
    };

    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      const local = digits.slice(1);
      push(local.startsWith('6') ? `2420${local}` : `2430${local}`);
      push(local.startsWith('6') ? `242${local}` : `243${local}`);
      return out;
    }

    // Prefer the stored form first (often 2420… for Congo mobiles that already chat).
    push(digits);

    if ((digits.startsWith('2420') || digits.startsWith('2430')) && digits.length >= 12) {
      push(`${digits.slice(0, 3)}${digits.slice(4)}`);
    } else if (
      (digits.startsWith('242') || digits.startsWith('243')) &&
      digits.length >= 11 &&
      digits.length <= 12 &&
      !digits.startsWith('2420') &&
      !digits.startsWith('2430')
    ) {
      push(`${digits.slice(0, 3)}0${digits.slice(3)}`);
    }

    return out;
  }

  filenameFromUrl(mediaUrl, mediaType = 'file') {
    try {
      const pathname = new URL(mediaUrl).pathname;
      const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
      if (filename) return filename;
    } catch {
      /* ignore */
    }
    return `campaign.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
  }

  async send(to, body, opts = {}) {
    if (!this.enabled) return { ok: true, skipped: true, reason: 'whatsapp_disabled' };
    if (!body || !String(body).trim()) throw new Error('Message WhatsApp vide');

    await this.refreshStatus();
    if (!this.cachedStatus.ready) {
      throw new Error(`Session OpenWA non prête (${this.cachedStatus.state})`);
    }

    const candidates = this.phoneCandidates(to);
    if (!candidates.length) throw new Error('Numéro WhatsApp invalide');

    const mediaUrl = opts.mediaUrl ? String(opts.mediaUrl).trim() : '';
    let lastError = null;

    for (const digits of candidates) {
      const chatId = `${digits}@c.us`;
      try {
        const result = mediaUrl
          ? await this.request(
              `/api/sessions/${encodeURIComponent(this.sessionId)}/messages/send-media`,
              {
                method: 'POST',
                body: {
                  chatId,
                  mediaUrl,
                  mediaType: opts.mediaType || 'image',
                  filename: this.filenameFromUrl(mediaUrl, opts.mediaType || 'image'),
                  caption: String(body).slice(0, 1024),
                },
                timeoutMs: 60000,
              }
            )
          : await this.request(
              `/api/sessions/${encodeURIComponent(this.sessionId)}/messages/send-text`,
              {
                method: 'POST',
                body: { chatId, text: String(body) },
                timeoutMs: 30000,
              }
            );

        if (!result?.messageId) {
          throw new Error('OpenWA a accepté une réponse sans messageId');
        }

        this.pushEvent('info', `message accepté → +${digits} id=${result.messageId}`);
        return {
          ok: true,
          id: result.messageId,
          to: `+${digits}`,
          chatId,
          acceptedAt: result.timestamp || null,
          transport: 'openwa',
          media: Boolean(mediaUrl),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message || '';
        // Try next Congo/E.164 variant when OpenWA cannot resolve this chatId.
        if (/could not resolve|not on WhatsApp|404|400/i.test(msg) && candidates.length > 1) {
          this.pushEvent('warn', `résolution échouée pour ${chatId}, essai variante…`);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('Envoi OpenWA impossible');
  }
}
