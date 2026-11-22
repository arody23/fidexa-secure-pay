import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

/**
 * Génère un lien de récupération Supabase et l’envoie sur WhatsApp
 * (au lieu de l’email Gmail).
 */

function digitsOnlyPhone(phone: string): string | null {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Keep Congo trunk-0 form as stored (2420…) — OpenWA resolves existing chats that way.
  // The notification worker also tries the E.164 variant without the 0.
  return digits.length >= 9 ? digits : null;
}

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

    // Réponse neutre (pas d’énumération de comptes)
    const neutral = {
      success: true,
      message: 'Si un compte existe, un lien WhatsApp a été envoyé.',
    };

    // Lookup case-insensitive: ilike exact email
    const { data: profile } = await admin
      .from('users')
      .select('id, phone_number, email, full_name')
      .ilike('email', email)
      .maybeSingle();

    const phone = digitsOnlyPhone(profile?.phone_number || '');
    if (!profile?.id || !phone) {
      console.warn('[password-reset-whatsapp] no profile/phone for request');
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountEmail = String(profile.email || email).trim().toLowerCase();

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: accountEmail,
      options: {
        redirectTo: `${origin}/auth/reset-password`,
      },
    });

    if (linkErr || !linkData) {
      console.error('[password-reset-whatsapp] generateLink', linkErr);
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const properties = linkData.properties as {
      action_link?: string;
      hashed_token?: string;
    } | null;

    // Prefer an app-owned PKCE-compatible link (token_hash) so WhatsApp opens
    // the SPA directly — action_link often fails redirect allowlists / PKCE.
    const hashedToken = properties?.hashed_token || '';
    const resetLink = hashedToken
      ? `${origin}/auth/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
      : properties?.action_link || '';

    if (!resetLink) {
      console.error('[password-reset-whatsapp] empty reset link');
      return new Response(JSON.stringify(neutral), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dispatch = await dispatchNotificationEvent('auth.password_reset', {
      recipientPhone: phone,
      idempotencyKey: `auth.password_reset:${profile.id}:${Date.now()}`,
      variables: {
        reset_link: resetLink,
        email: accountEmail,
      },
      metadata: {
        profile_id: profile.id,
        source: 'password-reset-whatsapp',
      },
    });

    if (!dispatch.ok) {
      console.error('[password-reset-whatsapp] dispatch failed', dispatch.error);
      return new Response(
        JSON.stringify({ error: 'Envoi WhatsApp temporairement indisponible. Réessayez.' }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ ...neutral, channel: 'whatsapp', queued: true }), {
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
