import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { notifyServicePost } from '../_shared/notifyDispatch.ts';

/**
 * Proxy public (anon) vers le notification-service pour OTP accès /order.
 * Actions: status | request-otp | verify | check-session
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = String(body.action || '');
    const linkId = String(body.linkId || '');

    if (!linkId) {
      return new Response(JSON.stringify({ error: 'linkId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link, error } = await supabase
      .from('payment_links')
      .select(
        'id, link_id, is_paid, client_name, client_phone, client_email, amount, currency, kpay_reference'
      )
      .eq('link_id', linkId)
      .maybeSingle();

    if (error || !link) {
      return new Response(JSON.stringify({ error: 'Commande introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!link.is_paid) {
      return new Response(JSON.stringify({ error: 'Commande non payée', requiresOtp: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      return new Response(
        JSON.stringify({
          requiresOtp: true,
          hasPhone: !!link.client_phone,
          maskedPhone: maskPhone(link.client_phone),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check-session') {
      const sessionToken = String(body.sessionToken || '');
      const upstream = await notifyServicePost('/v1/otp/validate-session', {
        linkId,
        sessionToken,
      });
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'request-otp') {
      if (!link.client_phone) {
        return new Response(
          JSON.stringify({
            error:
              'Aucun numéro WhatsApp client enregistré sur cette commande. Contactez le support FidexaPay.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const appUrl = (Deno.env.get('APP_PUBLIC_URL') || 'https://fidexapay.com').replace(/\/$/, '');
      const upstream = await notifyServicePost('/v1/otp/issue', {
        paymentLinkId: link.id,
        linkId: link.link_id,
        phone: link.client_phone,
        variables: {
          client_name: link.client_name || 'Client',
          amount: String(link.amount ?? ''),
          currency: String(link.currency || 'FCFA'),
          order_reference: link.kpay_reference || link.link_id,
          tracking_link: `${appUrl}/order/${link.link_id}`,
        },
      });
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      const code = String(body.code || '').trim();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Code requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const upstream = await notifyServicePost('/v1/otp/verify', { linkId, code });
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'action inconnue' }), {
      status: 400,
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

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.length < 6) return '***';
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}
