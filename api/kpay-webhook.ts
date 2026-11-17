/**
 * Proxy public K-Pay → Edge Function Supabase.
 * Obligatoire en Live : K-Pay n'accepte que des callbacks sur le domaine de l'app.
 *
 * Callback K-Pay (chemin uniquement) : /api/kpay-webhook
 * → https://fidexa-secure-pay.vercel.app/api/kpay-webhook
 */

export const config = {
  runtime: 'edge',
};

const TARGET =
  (typeof process !== 'undefined' &&
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, '')) ||
  'https://dkmbtwczuheyyxvuypml.supabase.co';

const WEBHOOK_URL = `${TARGET}/functions/v1/kpay-webhook`;

const FORWARD_HEADERS = [
  'content-type',
  'x-kpay-signature',
  'x-kpay-event',
  'x-kpay-timestamp',
  'user-agent',
] as const;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': FORWARD_HEADERS.join(', '),
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // Corps brut — requis pour la vérif HMAC côté Edge Function
  const body = await req.arrayBuffer();

  try {
    const upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body,
    });

    const responseBody = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    return new Response(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    console.error('[api/kpay-webhook] proxy failed', err);
    return new Response(JSON.stringify({ error: 'Webhook proxy failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
