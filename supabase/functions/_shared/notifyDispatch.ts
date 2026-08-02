/**
 * Queue persistante de notifications. Les Edge Functions n'attendent jamais
 * Chromium/WhatsApp : Railway consomme notification_jobs en arrière-plan.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

function notificationDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function insertJob(
  eventType: string,
  recipient: string,
  variables: Record<string, unknown>,
  metadata: Record<string, unknown>,
  idempotencyKey: string
) {
  const db = notificationDb();
  const { data, error } = await db
    .from('notification_jobs')
    .insert({
      idempotency_key: idempotencyKey,
      event_type: eventType,
      channel: 'whatsapp',
      recipient,
      variables,
      metadata,
    })
    .select('id, status, idempotency_key')
    .single();

  if (!error) return { job: data, duplicate: false };
  if (error.code !== '23505') throw new Error(error.message);

  const { data: existing, error: existingError } = await db
    .from('notification_jobs')
    .select('id, status, idempotency_key')
    .eq('idempotency_key', idempotencyKey)
    .single();
  if (existingError) throw new Error(existingError.message);
  return { job: existing, duplicate: true };
}

function randomOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export async function enqueueOrderOtp(payload: Record<string, unknown>) {
  const paymentLinkId = asString(payload.paymentLinkId);
  const linkId = asString(payload.linkId);
  const phone = asString(payload.phone || payload.clientPhone || payload.recipientPhone);
  if (!paymentLinkId || !linkId || !phone) {
    throw new Error('paymentLinkId, linkId et phone requis pour OTP');
  }

  const code = randomOtp();
  const ttlMinutes = Number(Deno.env.get('OTP_TTL_MINUTES') || 15);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const idempotencyKey =
    asString(payload.idempotencyKey) || `otp:${paymentLinkId}:${crypto.randomUUID()}`;
  const variables = {
    ...((payload.variables as Record<string, unknown>) || {}),
    otp: code,
    otp_minutes: String(ttlMinutes),
  };

  const { data, error } = await notificationDb().rpc('issue_order_otp_job', {
    p_payment_link_id: paymentLinkId,
    p_link_id: linkId,
    p_recipient: phone,
    p_code_hash: await sha256(code),
    p_expires_at: expiresAt,
    p_variables: variables,
    p_idempotency_key: idempotencyKey,
    p_metadata: { link_id: linkId, payment_link_id: paymentLinkId, source: 'edge' },
  });
  if (error) throw new Error(error.message);
  return { ok: true, job: data, expiresAt, ttlMinutes };
}

export async function dispatchNotificationEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; jobs?: unknown[]; error?: string }> {
  try {
    const recipientPhone = asString(payload.recipientPhone);
    const clientPhone = asString(payload.clientPhone);
    const paymentLinkId = asString(payload.paymentLinkId);
    const keyBase =
      asString(payload.idempotencyKey) ||
      `event:${eventType}:${paymentLinkId || crypto.randomUUID()}`;
    const variables = (payload.variables as Record<string, unknown>) || {};
    const jobs: unknown[] = [];

    if (recipientPhone) {
      jobs.push(
        await insertJob(
          eventType,
          recipientPhone,
          variables,
          { source: 'edge', event_type: eventType },
          `${keyBase}:recipient`
        )
      );
    }

    if (payload.issueOrderOtp === true || eventType === 'payment.completed') {
      jobs.push(
        await enqueueOrderOtp({
          ...payload,
          phone: clientPhone || recipientPhone,
          idempotencyKey: `${keyBase}:otp`,
        })
      );
    }

    return { ok: true, jobs };
  } catch (err) {
    console.error('[notifyDispatch] error', err);
    return { ok: false, error: err instanceof Error ? err.message : 'dispatch failed' };
  }
}

export async function notifyServicePost(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  const base = readSecret('NOTIFICATION_SERVICE_URL');
  const secret = readSecret('NOTIFICATION_SERVICE_SECRET');
  if (!base || !secret) {
    return new Response(JSON.stringify({ error: 'Notification service non configuré' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return fetch(`${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Secret': secret,
    },
    body: JSON.stringify(body),
  });
}
