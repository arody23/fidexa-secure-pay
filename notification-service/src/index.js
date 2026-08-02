import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { EmailChannel } from './channels/EmailChannel.js';
import { NotificationService } from './services/NotificationService.js';
import { NotificationQueue } from './services/NotificationQueue.js';
import { OtpService } from './services/OtpService.js';
import { supabase } from './lib/supabase.js';
import { WhatsAppBridge } from './lib/whatsappBridge.js';
import { OpenWaChannel } from './channels/OpenWaChannel.js';

const app = express();
const port = Number(process.env.PORT || 3099);
const serviceSecret = process.env.SERVICE_SECRET || '';
const whatsappTransport = (process.env.WHATSAPP_TRANSPORT || 'legacy').toLowerCase();

console.log('[notify] boot', {
  port,
  node: process.version,
  whatsapp: process.env.WHATSAPP_ENABLED !== 'false',
  whatsappTransport,
  hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
  hasServiceSecret: Boolean(serviceSecret),
});

if (!Number.isFinite(port) || port <= 0) {
  console.error('[notify] PORT invalide:', process.env.PORT);
  process.exit(1);
}

const whatsapp = whatsappTransport === 'openwa' ? new OpenWaChannel() : new WhatsAppBridge();
const email = new EmailChannel();
const notificationService = new NotificationService({ whatsapp, email });
const otpService = new OtpService(notificationService);
const notificationQueue = new NotificationQueue(notificationService);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function requireServiceAuth(req, res, next) {
  const header = req.headers['x-service-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!serviceSecret || header !== serviceSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/** Healthcheck Railway — doit répondre vite (avant Chromium). */
function healthOk(_req, res) {
  res.status(200).json({ ok: true, service: 'fidexa-notify', port });
}
app.get('/', healthOk);
app.get('/health', healthOk);

app.get('/health/detail', (_req, res) => {
  res.json({
    ok: true,
    whatsapp: whatsapp.status(),
    email: email.status(),
    queue: notificationQueue.status(),
  });
});

/** Railway is live if Express responds; ready requires the queue and WhatsApp worker. */
app.get('/ready', (_req, res) => {
  const wa = whatsapp.status();
  const queue = notificationQueue.status();
  const ready = queue.running && wa.ready;
  res.status(ready ? 200 : 503).json({ ready, whatsapp: wa, queue });
});

/** API métier unique — enregistre un job, sans attendre WhatsApp. */
app.post('/v1/notify', requireServiceAuth, async (req, res) => {
  try {
    const { eventType, recipientPhone, variables, channel, metadata, idempotencyKey } = req.body || {};
    if (!eventType || !recipientPhone) {
      return res.status(400).json({ error: 'eventType et recipientPhone requis' });
    }
    const result = await notificationService.enqueueNotification(
      eventType,
      recipientPhone,
      variables || {},
      { channel, metadata, idempotencyKey }
    );
    res.status(202).json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'send failed' });
  }
});

/** Après paiement: génère OTP + enregistre le message dans la queue. */
app.post('/v1/otp/issue', requireServiceAuth, async (req, res) => {
  try {
    const { paymentLinkId, linkId, phone, variables } = req.body || {};
    if (!paymentLinkId || !linkId || !phone) {
      return res.status(400).json({ error: 'paymentLinkId, linkId, phone requis' });
    }
    const result = await otpService.createAndQueue({
      paymentLinkId,
      linkId,
      phone,
      variables: variables || {},
      idempotencyKey: req.body?.idempotencyKey,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'otp issue failed';
    const status = message.includes('OTP_RATE_LIMITED') ? 429 : 500;
    console.error('[notify] /v1/otp/issue failed:', message);
    res.status(status).json({
      error:
        status === 429
          ? 'Veuillez attendre une minute avant de demander un nouveau code.'
          : message,
    });
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
 * payment.completed → enregistre les jobs notification/OTP sans attendre WhatsApp.
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
      idempotencyKey,
    } = req.body || {};

    const results = [];
    const eventKey = idempotencyKey || `event:${eventType}:${paymentLinkId || linkId || crypto.randomUUID()}`;

    if (recipientPhone) {
      results.push(
        await notificationService.enqueueNotification(eventType, recipientPhone, variables || {}, {
          metadata: { source: 'event' },
          idempotencyKey: `${eventKey}:recipient`,
        })
      );
    }

    // OTP accès page /order après paiement
    if (issueOrderOtp || eventType === 'payment.completed') {
      const phone = clientPhone || recipientPhone;
      if (paymentLinkId && linkId && phone) {
        results.push(
          await otpService.createAndQueue({
            paymentLinkId,
            linkId,
            phone,
            variables: variables || {},
            idempotencyKey: `${eventKey}:otp`,
          })
        );
      }
    }

    // Email futur
    if (recipientEmail && process.env.EMAIL_ENABLED === 'true') {
      results.push(
        await notificationService.enqueueNotification(eventType, recipientEmail, variables || {}, {
          channel: 'email',
          idempotencyKey: `${eventKey}:email`,
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
    const { eventType, recipientPhone, variables, idempotencyKey } = req.body || {};
    const result = await notificationService.enqueueNotification(
      eventType,
      recipientPhone,
      variables || {},
      { metadata: { test: true }, idempotencyKey }
    );
    res.status(202).json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'test failed';
    console.error('[debug:H4] /v1/templates/test failed:', message);
    res.status(500).json({ error: message });
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
    queue: notificationQueue.status(),
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

// 0.0.0.0 obligatoire sur Railway — HTTP d'abord, Chromium après.
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[notify] listening on 0.0.0.0:${port}`);
  // Attendre que /health soit servi avant Puppeteer (mémoire).
  setTimeout(() => {
    try {
      whatsapp.start();
    } catch (err) {
      console.error('[whatsapp-bridge] start failed:', err instanceof Error ? err.message : err);
    }
  }, 15000);
  notificationQueue.start();
});

server.on('error', (err) => {
  console.error('[notify] listen error:', err);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`[notify] ${signal} reçu — arrêt queue et worker`);
  notificationQueue.stop();
  whatsapp.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
