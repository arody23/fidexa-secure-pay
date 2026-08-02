/**
 * Dispatch d'événements vers le notification-service Node (whatsapp-web.js).
 * Aucun texte de message ici — uniquement eventType + variables.
 */

function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

export async function dispatchNotificationEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const base = readSecret('NOTIFICATION_SERVICE_URL');
  const secret = readSecret('NOTIFICATION_SERVICE_SECRET');
  if (!base || !secret) {
    console.warn('[notifyDispatch] NOTIFICATION_SERVICE_URL/SECRET manquants — skip');
    return { ok: false, skipped: true, error: 'not_configured' };
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/events/${encodeURIComponent(eventType)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': secret,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[notifyDispatch] failed', res.status, data);
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true };
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
