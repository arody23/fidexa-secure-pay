import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  amountForGeniusPay,
  corsHeaders,
  getGeniusPayBaseUrl,
  getGeniusPayHeaders,
  resolveLinkCurrency,
} from '../_shared/geniuspay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId, phone, customerName, customerEmail, origin } = await req.json();

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
      .select('id, link_id, amount, description, is_paid, client_name, client_email, client_phone, currency, provider_id, geniuspay_reference, geniuspay_checkout_url')
      .eq('link_id', linkId)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: 'Lien introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.is_paid) {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.geniuspay_checkout_url && link.geniuspay_reference && link.geniuspay_status === 'pending') {
      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: link.geniuspay_checkout_url,
          reference: link.geniuspay_reference,
          reused: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currency = await resolveLinkCurrency(supabase, link);
    console.log('[GeniusPay] create-payment input', {
      linkId,
      dbAmount: link.amount,
      dbCurrency: link.currency,
      resolvedCurrency: currency,
    });

    const converted = amountForGeniusPay(Number(link.amount), currency);
    const siteOrigin = (origin || 'http://localhost:5173').replace(/\/$/, '');

    // GeniusPay = XOF uniquement. Montant API = amountXof (même valeur que metadata).
    const payload = {
      amount: converted.amountXof,
      currency: 'XOF',
      description: (link.description || 'Commande FidexaPay').slice(0, 500),
      customer: {
        name: customerName || link.client_name || 'Client FidexaPay',
        email: customerEmail || link.client_email || undefined,
        phone: phone
          ? (String(phone).startsWith('+') ? phone : `+${String(phone).replace(/\D/g, '')}`)
          : (link.client_phone || '+2250700000000'),
      },
      success_url: `${siteOrigin}/pay/${linkId}?geniuspay=success`,
      error_url: `${siteOrigin}/pay/${linkId}?geniuspay=cancel`,
      metadata: {
        link_id: link.link_id,
        payment_link_id: link.id,
        original_amount: String(converted.originalAmount),
        original_currency: converted.originalCurrency,
        amount_xof: String(converted.amountXof),
        rate_used: converted.rateUsed,
      },
    };

    console.log('[GeniusPay] payload envoyé', {
      amount: payload.amount,
      currency: payload.currency,
      originalAmount: converted.originalAmount,
      originalCurrency: converted.originalCurrency,
      rateUsed: converted.rateUsed,
    });

    const gpRes = await fetch(`${getGeniusPayBaseUrl()}/payments`, {
      method: 'POST',
      headers: getGeniusPayHeaders(),
      body: JSON.stringify(payload),
    });

    const gpData = await gpRes.json();

    if (!gpRes.ok) {
      console.error('GeniusPay create error:', gpData);
      const detail =
        gpData.message ||
        gpData.error ||
        gpData.errors?.[0]?.message ||
        'Initialisation GeniusPay échouée';
      return new Response(JSON.stringify({ error: detail, code: gpData.code }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tx = gpData.data ?? gpData;
    const checkoutUrl = tx.checkout_url || tx.payment_url;
    const reference = tx.reference;
    const paymentId = tx.id ?? null;

    if (!checkoutUrl || !reference) {
      console.error('GeniusPay response missing checkout_url/reference:', gpData);
      return new Response(JSON.stringify({ error: 'Réponse GeniusPay invalide' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('payment_links')
      .update({
        geniuspay_reference: reference,
        geniuspay_payment_id: paymentId,
        geniuspay_status: tx.status || 'pending',
        geniuspay_checkout_url: checkoutUrl,
        geniuspay_amount_xof: converted.amountXof,
        geniuspay_fees: tx.fees ?? null,
        payment_method: 'geniuspay',
        currency: currency,
        updated_at: now,
      })
      .eq('id', link.id);

    if (updateError) {
      console.error('DB update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl,
        reference,
        amountXof: converted.amountXof,
        originalAmount: converted.originalAmount,
        originalCurrency: converted.originalCurrency,
        fees: tx.fees ?? null,
        environment: tx.environment ?? 'sandbox',
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
