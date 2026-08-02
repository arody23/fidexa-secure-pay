import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { EmailChannel } from './channels/EmailChannel.js';
import { NotificationService } from './services/NotificationService.js';
import { OtpService } from './services/OtpService.js';
import { supabase } from './lib/supabase.js';
import { WhatsAppBridge } from './lib/whatsappBridge.js';

const app = express();
const port = Number(process.env.PORT || 3099);
const serviceSecret = process.env.SERVICE_SECRET || '';

const whatsapp = new WhatsAppBridge();
const email = new EmailChannel();
const notificationService = new NotificationService({ whatsapp, email });
const otpService = new OtpService(notificationService);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function requireServiceAuth(req, res, next) {
  const header = req.headers['x-service-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!serviceSecret || header !== serviceSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    whatsapp: whatsapp.status(),
    email: email.status(),
  });
});

/** API métier unique */
app.post('/v1/notify', requireServiceAuth, async (req, res) => {
  try {
    const { eventType, recipientPhone, variables, channel, metadata } = req.body || {};
    if (!eventType || !recipientPhone) {
      return res.status(400).json({ error: 'eventType et recipientPhone requis' });
    }
    const result = await notificationService.sendNotification(
      eventType,
      recipientPhone,
      variables || {},
      { channel, metadata }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'send failed' });
  }
});

/** Après paiement: génère OTP + envoie WhatsApp */
app.post('/v1/otp/issue', requireServiceAuth, async (req, res) => {
  try {
    const { paymentLinkId, linkId, phone, variables } = req.body || {};
    if (!paymentLinkId || !linkId || !phone) {
      return res.status(400).json({ error: 'paymentLinkId, linkId, phone requis' });
    }
    const result = await otpService.createAndSend({
      paymentLinkId,
      linkId,
      phone,
      variables: variables || {},
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'otp issue failed' });
  }
});

/** Vérifie OTP → session cookie token */
app.post('/v1/otp/verify', requireServiceAuth, async (req, res) => {
  try {
    const { linkId, code } = req.body || {};
    if (!linkId || !code) return res.status(400).json({ error: 'linkId et code requis' });
    const result = await otpService.verify({ linkId, code: String(code).trim() });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'otp verify failed' });
  }
});

app.post('/v1/otp/validate-session', requireServiceAuth, async (req, res) => {
  try {
    const { linkId, sessionToken } = req.body || {};
    const valid = await otpService.validateSession({ linkId, sessionToken });
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'session check failed' });
  }
});

/**
 * Événement métier (webhooks Edge Functions).
 * payment.completed → notifie + émet OTP d'accès suivi.
 */
app.post('/v1/events/:eventType', requireServiceAuth, async (req, res) => {
  try {
    const eventType = req.params.eventType;
    const {
      recipientPhone,
      recipientEmail,
      variables,
      issueOrderOtp,
      paymentLinkId,
      linkId,
      clientPhone,
    } = req.body || {};

    const results = [];

    if (recipientPhone) {
      results.push(
        await notificationService.sendNotification(eventType, recipientPhone, variables || {}, {
          metadata: { source: 'event' },
        })
      );
    }

    // OTP accès page /order après paiement
    if (issueOrderOtp || eventType === 'payment.completed') {
      const phone = clientPhone || recipientPhone;
      if (paymentLinkId && linkId && phone) {
        results.push(
          await otpService.createAndSend({
            paymentLinkId,
            linkId,
            phone,
            variables: variables || {},
          })
        );
      }
    }

    // Email futur
    if (recipientEmail && process.env.EMAIL_ENABLED === 'true') {
      results.push(
        await notificationService.sendNotification(eventType, recipientEmail, variables || {}, {
          channel: 'email',
        })
      );
    }

    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'event failed' });
  }
});

/** Admin templates */
app.get('/v1/templates', requireServiceAuth, async (req, res) => {
  try {
    const rows = await notificationService.listTemplates({
      search: req.query.search,
      category: req.query.category,
    });
    res.json({ templates: rows });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'list failed' });
  }
});

app.patch('/v1/templates/:id', requireServiceAuth, async (req, res) => {
  try {
    const row = await notificationService.updateTemplate(req.params.id, req.body || {});
    res.json({ template: row });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'update failed' });
  }
});

app.post('/v1/templates/preview', requireServiceAuth, async (req, res) => {
  try {
    const { body, variables } = req.body || {};
    res.json({ preview: notificationService.preview(body || '', variables || {}) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'preview failed' });
  }
});

app.post('/v1/templates/test', requireServiceAuth, async (req, res) => {
  try {
    const { eventType, recipientPhone, variables } = req.body || {};
    const result = await notificationService.sendNotification(
      eventType,
      recipientPhone,
      variables || {},
      { metadata: { test: true } }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'test failed' });
  }
});

app.get('/v1/logs', requireServiceAuth, async (req, res) => {
  try {
    const logs = await notificationService.listLogs(Number(req.query.limit || 50));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'logs failed' });
  }
});

/** —— Admin WhatsApp (dashboard) —— */
app.get('/v1/admin/whatsapp', requireServiceAuth, (_req, res) => {
  res.json(whatsapp.adminStatus());
});

app.post('/v1/admin/whatsapp/reconnect', requireServiceAuth, async (_req, res) => {
  try {
    const status = await whatsapp.reconnect();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'reconnect failed' });
  }
});

app.post('/v1/admin/whatsapp/logout', requireServiceAuth, async (_req, res) => {
  try {
    const status = await whatsapp.logout();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'logout failed' });
  }
});

app.get('/v1/admin/overview', requireServiceAuth, async (_req, res) => {
  // WhatsApp d'abord (cache local) — les logs Supabase ne doivent pas bloquer le QR.
  let logs = [];
  try {
    logs = await Promise.race([
      notificationService.listLogs(30),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('logs timeout')), 2500)
      ),
    ]);
  } catch {
    logs = [];
  }
  res.json({
    whatsapp: whatsapp.adminStatus(),
    email: email.status(),
    logs,
  });
});

/** Lookup lien pour variables (interne) */
app.get('/v1/orders/:linkId', requireServiceAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('payment_links')
    .select('id, link_id, amount, currency, client_name, client_email, client_phone, provider_id, kpay_reference, is_paid')
    .eq('link_id', req.params.linkId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json({ order: data });
});

app.listen(port, () => {
  console.log(`[notify] listening on :${port}`);
  console.log('[notify] Dashboard WhatsApp: Admin Fidexa → WhatsApp');
  whatsapp.start();
});
