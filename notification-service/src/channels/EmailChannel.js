/**
 * Canal Email — stub prêt pour Gmail/SMTP.
 * Même interface que WhatsAppChannel pour l'extensibilité.
 */
export class EmailChannel {
  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';
  }

  async send(to, body, subject = 'FidexaPay') {
    if (!this.enabled) {
      return { ok: true, skipped: true, reason: 'email_not_configured' };
    }
    // TODO: nodemailer / Gmail OAuth
    throw new Error('Canal email non encore configuré');
  }

  status() {
    return { enabled: this.enabled, ready: false };
  }
}
