import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

/**
 * Génère un lien de récupération Supabase et l’envoie sur WhatsApp
 * (au lieu de l’email Gmail).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const origin = String(body.origin || 'https://fidexa-secure-pay.vercel.app').replace(/\/$/, '');

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await admin
      .from('users')
      .select('id, phone_number, email, full_name')
      .eq('email', email)
      .maybeSingle();

    // Réponse neutre (pas d’énumération de comptes)
    const neutral = {
      success: true,
      message: 'Si un compte existe, un lien WhatsApp a été envoyé.',
    };

    if (!profile?.phone_number) {
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const phone = String(profile.phone_number).replace(/\D/g, '');
    if (phone.length < 9) {
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/auth/reset-password`,
      },
    });

    if (linkErr || !linkData) {
      console.error('generateLink', linkErr);
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const properties = linkData.properties as {
      action_link?: string;
      hashed_token?: string;
    } | null;
    let resetLink = properties?.action_link || '';
    if (!resetLink && properties?.hashed_token) {
      resetLink = `${origin}/auth/reset-password#access_token=${properties.hashed_token}&type=recovery`;
    }
    if (!resetLink) {
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await dispatchNotificationEvent('auth.password_reset', {
      recipientPhone: phone,
      idempotencyKey: `auth.password_reset:${profile.id}:${Date.now()}`,
      variables: {
        reset_link: resetLink,
        email,
      },
    });

    return new Response(JSON.stringify({ ...neutral, channel: 'whatsapp' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
