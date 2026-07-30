import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getPayPalApiBase } from '../_shared/paypal.ts';

async function verifyWebhook(req: Request, body: string): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!webhookId) {
    console.warn('PAYPAL_WEBHOOK_ID non configuré — skip verify en dev');
    return true;
  }

  const transmissionId = req.headers.get('paypal-transmission-id');
  const transmissionTime = req.headers.get('paypal-transmission-time');
  const certUrl = req.headers.get('paypal-cert-url');
  const authAlgo = req.headers.get('paypal-auth-algo');
  const transmissionSig = req.headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
  const auth = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const { access_token } = await tokenRes.json();

  const verifyRes = await fetch(`${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  const verifyData = await verifyRes.json();
  return verifyData.verification_status === 'SUCCESS';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();

  try {
    const verified = await verifyWebhook(req, body);
    if (!verified) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event_type as string;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const customId = resource.custom_id as string | undefined;
      const captureId = resource.id as string;

      if (!customId) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: link } = await supabase
        .from('payment_links')
        .select('id, is_paid')
        .eq('id', customId)
        .maybeSingle();

      if (link && !link.is_paid) {
        const now = new Date().toISOString();
        await supabase
          .from('payment_links')
          .update({
            is_paid: true,
            status: 'paid',
            order_status: 'paid',
            paid_at: now,
            paypal_capture_id: captureId,
            paypal_status: 'COMPLETED',
            payment_method: 'paypal_card',
            escrow_released: false,
            updated_at: now,
          })
          .eq('id', link.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Webhook failed' }), { status: 500 });
  }
});
