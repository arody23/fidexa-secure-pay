import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * OTP d'accès à la page de suivi commande + sessions cookie.
 */
export class OtpService {
  /**
   * @param {import('./NotificationService.js').NotificationService} notificationService
   */
  constructor(notificationService) {
    this.notify = notificationService;
    this.ttlMinutes = Number(process.env.OTP_TTL_MINUTES || 15);
    this.sessionDays = Number(process.env.ORDER_SESSION_DAYS || 7);
  }

  async createAndSend({ paymentLinkId, linkId, phone, variables = {} }) {
    if (!phone) throw new Error('Numéro client requis pour OTP WhatsApp');

    const code = randomOtp();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000).toISOString();

    const { error } = await supabase.from('order_access_otps').insert({
      payment_link_id: paymentLinkId,
      link_id: linkId,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    // Dev aid: code visible dans les logs serveur (jamais renvoyé au client)
    console.log(`[otp] link=${linkId} code=${code} expires=${expiresAt}`);

    await this.notify.sendNotification(
      'otp.order_access',
      phone,
      {
        ...variables,
        otp: code,
        otp_minutes: String(this.ttlMinutes),
      },
      { metadata: { link_id: linkId, payment_link_id: paymentLinkId } }
    );

    return { ok: true, expiresAt, ttlMinutes: this.ttlMinutes };
  }

  async verify({ linkId, code }) {
    const { data: rows, error } = await supabase
      .from('order_access_otps')
      .select('*')
      .eq('link_id', linkId)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);

    const otp = rows?.[0];
    if (!otp) throw new Error('Aucun code actif — demandez un nouvel OTP');
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new Error('Code expiré — demandez un nouvel OTP');
    }
    if (otp.attempts >= otp.max_attempts) {
      throw new Error('Trop de tentatives — demandez un nouvel OTP');
    }

    const ok = sha256(code) === otp.code_hash;
    await supabase
      .from('order_access_otps')
      .update({
        attempts: otp.attempts + 1,
        used_at: ok ? new Date().toISOString() : null,
      })
      .eq('id', otp.id);

    if (!ok) throw new Error('Code incorrect');

    const token = randomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(
      Date.now() + this.sessionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: sessErr } = await supabase.from('order_access_sessions').insert({
      payment_link_id: otp.payment_link_id,
      link_id: linkId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (sessErr) throw new Error(sessErr.message);

    return {
      ok: true,
      sessionToken: token,
      expiresAt,
      cookieName: `fidexa_order_${linkId}`,
      maxAgeSeconds: this.sessionDays * 24 * 60 * 60,
    };
  }

  async validateSession({ linkId, sessionToken }) {
    if (!sessionToken) return false;
    const tokenHash = sha256(sessionToken);
    const { data, error } = await supabase
      .from('order_access_sessions')
      .select('id, expires_at')
      .eq('link_id', linkId)
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error || !data) return false;
    if (new Date(data.expires_at).getTime() < Date.now()) return false;

    await supabase
      .from('order_access_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', data.id);

    return true;
  }
}
