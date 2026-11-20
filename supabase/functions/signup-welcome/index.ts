import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

/** Accueil WhatsApp après inscription prestataire. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || '').replace(/\D/g, '');
    const country = String(body.country || '').toUpperCase() || null;
    const origin = String(body.origin || 'https://fidexa-secure-pay.vercel.app').replace(/\/$/, '');

    if (phone.length < 9) {
      return new Response(JSON.stringify({ error: 'Téléphone invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const marketingOptIn = Boolean(body.marketingOptIn);
    await admin
      .from('users')
      .update({
        phone_number: phone,
        country,
        whatsapp_marketing_opt_in: marketingOptIn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await dispatchNotificationEvent('provider.welcome', {
      recipientPhone: phone,
      idempotencyKey: `provider.welcome:${user.id}`,
      variables: {
        dashboard_url: `${origin}/dashboard`,
        email: user.email || '',
        country: country || '',
      },
    });

    return new Response(
      JSON.stringify({ success: true, notified: true, marketingOptIn }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
