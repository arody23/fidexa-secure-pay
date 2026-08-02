import { supabase } from '../lib/supabase.js';
import { renderTemplate, previewVariables } from '../lib/render.js';

/**
 * Service unique d'envoi de notifications.
 * Aucun texte métier en dur — tout vient de notification_templates.
 */
export class NotificationService {
  /**
   * @param {{ whatsapp: import('../channels/WhatsAppChannel.js').WhatsAppChannel, email: import('../channels/EmailChannel.js').EmailChannel }} channels
   */
  constructor(channels) {
    this.channels = channels;
  }

  async getTemplate(eventType, channel = 'whatsapp') {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('event_type', eventType)
      .eq('channel', channel)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async listTemplates({ search, category } = {}) {
    let q = supabase.from('notification_templates').select('*').order('category').order('name');
    if (category && category !== 'all') q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    let rows = data || [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.event_type.toLowerCase().includes(s) ||
          (t.body || '').toLowerCase().includes(s)
      );
    }
    return rows;
  }

  async updateTemplate(id, patch) {
    const allowed = {};
    if (patch.body !== undefined) allowed.body = patch.body;
    if (patch.is_active !== undefined) allowed.is_active = patch.is_active;
    if (patch.name !== undefined) allowed.name = patch.name;
    if (patch.description !== undefined) allowed.description = patch.description;
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('notification_templates')
      .update(allowed)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  preview(body, variables = {}) {
    return renderTemplate(body, previewVariables(variables));
  }

  /**
   * @param {string} eventType
   * @param {string} recipientPhone
   * @param {Record<string, string|number>} variables
   * @param {{ channel?: string, metadata?: object }} opts
   */
  async sendNotification(eventType, recipientPhone, variables = {}, opts = {}) {
    const channelName = opts.channel || 'whatsapp';
    const template = await this.getTemplate(eventType, channelName);

    if (!template) {
      const err = `Template introuvable pour ${eventType}/${channelName}`;
      await this.log({
        event_type: eventType,
        channel: channelName,
        recipient: recipientPhone || '',
        body: null,
        status: 'failed',
        error: err,
        metadata: opts.metadata || {},
      });
      throw new Error(err);
    }

    if (!template.is_active) {
      await this.log({
        event_type: eventType,
        channel: channelName,
        recipient: recipientPhone || '',
        body: template.body,
        status: 'failed',
        error: 'template_disabled',
        metadata: opts.metadata || {},
      });
      return { ok: false, skipped: true, reason: 'template_disabled' };
    }

    const now = new Date();
    const enriched = {
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      ...variables,
    };
    const body = renderTemplate(template.body, enriched);

    try {
      const channel = this.channels[channelName];
      if (!channel) throw new Error(`Canal non supporté: ${channelName}`);
      const result = await channel.send(recipientPhone, body);
      await this.log({
        event_type: eventType,
        channel: channelName,
        recipient: recipientPhone,
        body,
        status: 'sent',
        error: null,
        metadata: { ...(opts.metadata || {}), result },
      });
      return { ok: true, body, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.log({
        event_type: eventType,
        channel: channelName,
        recipient: recipientPhone,
        body,
        status: 'failed',
        error: message,
        metadata: opts.metadata || {},
      });
      throw err;
    }
  }

  async log(row) {
    const { error } = await supabase.from('notification_logs').insert({
      event_type: row.event_type,
      channel: row.channel,
      recipient: row.recipient,
      body: row.body,
      status: row.status,
      error: row.error,
      metadata: row.metadata || {},
    });
    if (error) console.error('[notify] log insert failed', error.message);
  }

  async listLogs(limit = 50) {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }
}
