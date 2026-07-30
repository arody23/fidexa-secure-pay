import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildGeniusPayCharge,
  countryHintFromCurrency,
  corsHeaders,
  fetchGeniusPayPayment,
  getGeniusPayBaseUrl,
  getGeniusPayHeaders,
  markLinkPaid,
  resolveLinkCurrency,
} from '../_shared/geniuspay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId, phone, customerName, customerEmail, origin, forceNew } = await req.json();

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
      .select(
        'id, link_id, amount, description, is_paid, client_name, client_email, client_phone, currency, provider_id, geniuspay_reference, geniuspay_checkout_url, geniuspay_status'
      )
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

    // Session GeniusPay existante : vérifier le vrai statut (évite les « pending » bloqués)
    if (link.geniuspay_reference && !forceNew) {
      try {
        const gp = await fetchGeniusPayPayment(link.geniuspay_reference);
        const tx = gp.data ?? gp;
        const status = String(tx.status || '').toLowerCase();

        if (status === 'completed' || status === 'success') {
          await markLinkPaid(supabase, link.id, {
            reference: link.geniuspay_reference,
            geniuspayPaymentId: tx.id ?? null,
            status: 'completed',
            fees: tx.fees ?? null,
            gateway: tx.payment_method ?? tx.gateway ?? null,
          });
          return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (
          (status === 'pending' || status === 'processing') &&
          link.geniuspay_checkout_url
        ) {
          const expiresAt = tx.expires_at ? new Date(tx.expires_at).getTime() : null;
          const stillValid = !expiresAt || expiresAt > Date.now();
          if (stillValid) {
            return new Response(
              JSON.stringify({
                success: true,
                checkoutUrl: link.geniuspay_checkout_url,
                reference: link.geniuspay_reference,
                reused: true,
                status,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // failed / cancelled / expired → on crée une nouvelle session
        console.log('[GeniusPay] ancienne session invalide, nouvelle création', {
          reference: link.geniuspay_reference,
          status,
        });
      } catch (err) {
        console.warn('[GeniusPay] impossible de vérifier l’ancienne session', err);
      }
    }

    const currency = await resolveLinkCurrency(supabase, link);
    console.log('[GeniusPay] create-payment input', {
      linkId,
      dbAmount: link.amount,
      dbCurrency: link.currency,
      resolvedCurrency: currency,
    });

    // Pas de conversion maison : GeniusPay convertit USD/EUR/CDF → XOF automatiquement
    const charge = buildGeniusPayCharge(Number(link.amount), currency);
    const siteOrigin = (origin || 'http://localhost:5173').replace(/\/$/, '');
    const country =
      countryHintFromCurrency(charge.currency) ||
      (charge.currency === 'CDF' ? 'CD' : undefined);

    const payload: Record<string, unknown> = {
      amount: charge.amount,
      currency: charge.currency,
      description: (link.description || 'Commande FidexaPay').slice(0, 500),
      customer: {
        name: customerName || link.client_name || 'Client FidexaPay',
        email: customerEmail || link.client_email || undefined,
        phone: phone
          ? String(phone).startsWith('+')
            ? phone
            : `+${String(phone).replace(/\D/g, '')}`
          : link.client_phone || '+2250700000000',
        ...(country ? { country } : {}),
      },
      success_url: `${siteOrigin}/pay/${linkId}?geniuspay=success`,
      error_url: `${siteOrigin}/pay/${linkId}?geniuspay=cancel`,
      metadata: {
        link_id: link.link_id,
        payment_link_id: link.id,
        original_amount: String(charge.originalAmount),
        original_currency: charge.originalCurrency,
        api_amount: String(charge.amount),
        api_currency: charge.currency,
        conversion_mode: charge.conversionMode,
      },
    };

    console.log('[GeniusPay] payload envoyé (sans conversion Fidexa)', {
      amount: payload.amount,
      currency: payload.currency,
      originalAmount: charge.originalAmount,
      originalCurrency: charge.originalCurrency,
      conversionMode: charge.conversionMode,
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
        geniuspay_amount_xof: charge.currency === 'XOF' ? charge.amount : null,
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
        amount: charge.amount,
        currency: charge.currency,
        originalAmount: charge.originalAmount,
        originalCurrency: charge.originalCurrency,
        conversionMode: charge.conversionMode,
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
