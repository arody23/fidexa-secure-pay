import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function initVapid() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@fidexapay.com';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY requis');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader?.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id et title requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    initVapid();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    );

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!subs?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appOrigin = (
      Deno.env.get('APP_PUBLIC_URL') || 'https://fidexa-secure-pay.vercel.app'
    ).replace(/\/$/, '');
    const relativeOrAbs = url || '/dashboard/notifications';
    const absoluteUrl = relativeOrAbs.startsWith('http')
      ? relativeOrAbs
      : `${appOrigin}${relativeOrAbs.startsWith('/') ? '' : '/'}${relativeOrAbs}`;

    const payload = JSON.stringify({
      title,
      body: body || title,
      url: absoluteUrl,
    });
    let sent = 0;
    const stale: string[] = [];
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 60 * 60 * 12, urgency: 'high' }
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        const message = err instanceof Error ? err.message : String(err);
        console.error('webpush fail', status, message, sub.endpoint?.slice(0, 48));
        if (status === 404 || status === 410) stale.push(sub.endpoint);
        else errors.push(`${status || 'err'}: ${message}`);
      }
    }

    if (stale.length) {
      await supabase.from('push_subscriptions').delete().eq('user_id', user_id).in('endpoint', stale);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        stale: stale.length,
        errors: errors.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('send-web-push error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
