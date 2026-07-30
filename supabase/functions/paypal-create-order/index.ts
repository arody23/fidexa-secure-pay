import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  amountForPayPal,
  corsHeaders,
  getPayPalAccessToken,
  getPayPalApiBase,
  resolveLinkCurrency,
} from '../_shared/paypal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId } = await req.json();
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

    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select('id, link_id, amount, description, is_paid, client_name, currency, provider_id')
      .eq('link_id', linkId)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: 'Lien de paiement introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.is_paid) {
      return new Response(JSON.stringify({ error: 'Commande déjà payée' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let currency = await resolveLinkCurrency(supabase, link);
    const paypalAmount = amountForPayPal(Number(link.amount), currency);
    const token = await getPayPalAccessToken();
    const origin = req.headers.get('origin') || 'http://localhost:8080';

    const orderRes = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: link.link_id,
            custom_id: link.id,
            description: (link.description || 'Commande FidexaPay').slice(0, 127),
            amount: {
              currency_code: paypalAmount.currency_code,
              value: paypalAmount.value,
            },
          },
        ],
        application_context: {
          brand_name: 'FidexaPay',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${origin}/pay/${linkId}?paypal=success`,
          cancel_url: `${origin}/pay/${linkId}?paypal=cancel`,
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      console.error('PayPal create order error:', orderData);
      return new Response(
        JSON.stringify({ error: orderData.message || 'Erreur PayPal create order' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('payment_links')
      .update({
        currency,
        paypal_order_id: orderData.id,
        paypal_status: orderData.status,
        paypal_amount: paypalAmount.value,
        paypal_currency: paypalAmount.currency_code,
        payment_method: 'paypal',
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        paypalAmount,
        originalAmount: link.amount,
        currency: currency || 'FCFA',
      }),
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
