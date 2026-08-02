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
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) throw new Error('Numéro WhatsApp invalide');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
      digits = `243${digits.slice(1)}`;
    }
    return digits;
  }

  async send(to, body) {
    if (!this.enabled) return { ok: true, skipped: true, reason: 'whatsapp_disabled' };
    if (!body || !String(body).trim()) throw new Error('Message WhatsApp vide');

    await this.refreshStatus();
    if (!this.cachedStatus.ready) {
      throw new Error(`Session OpenWA non prête (${this.cachedStatus.state})`);
    }

    const digits = this.normalizePhone(to);
    const result = await this.request(
      `/api/sessions/${encodeURIComponent(this.sessionId)}/messages/send-text`,
      {
        method: 'POST',
        body: { chatId: `${digits}@c.us`, text: String(body) },
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
      chatId: `${digits}@c.us`,
      acceptedAt: result.timestamp || null,
      transport: 'openwa',
    };
  }
}
