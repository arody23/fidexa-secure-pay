import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildKPayProviderAmount,
  countryIso2ToIso3,
  corsHeaders,
  createKPayGatewayPayment,
  fetchKPayPayment,
  markLinkPaid,
  predictKPayProvider,
  resolveLinkCurrency,
} from '../_shared/kpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId, customerName, customerEmail, phoneNumber, origin, forceNew } = await req.json();

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
        'id, link_id, amount, description, is_paid, client_name, client_email, client_country, client_momo_phone, client_phone, currency, provider_id, kpay_reference, kpay_payment_id, kpay_checkout_url, kpay_status'
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

    if (link.kpay_payment_id && !forceNew) {
      try {
        const tx = await fetchKPayPayment(link.kpay_payment_id);
        const status = String(tx.status || '').toUpperCase();

        if (status === 'COMPLETED') {
          await markLinkPaid(supabase, link.id, {
            reference: tx.reference || link.kpay_reference,
            kpayPaymentId: tx.id ?? link.kpay_payment_id,
            status: 'COMPLETED',
            fees: tx.feeAmount ?? null,
            gateway: tx.provider ?? null,
          });
          return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (
          (status === 'PENDING' || status === 'PROCESSING') &&
          link.kpay_checkout_url
        ) {
          const expiresAt = tx.expiresAt ? new Date(tx.expiresAt).getTime() : null;
          const stillValid = !expiresAt || expiresAt > Date.now();
          if (stillValid) {
            return new Response(
              JSON.stringify({
                success: true,
                checkoutUrl: link.kpay_checkout_url,
                reference: link.kpay_reference,
                paymentId: link.kpay_payment_id,
                reused: true,
                status,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log('[KPay] ancienne session invalide, nouvelle création', {
          paymentId: link.kpay_payment_id,
          status,
        });
      } catch (err) {
        console.warn('[KPay] impossible de vérifier l’ancienne session', err);
      }
    }

    const payerPhone = String(phoneNumber || link.client_momo_phone || link.client_phone || '').replace(/\D/g, '');
    if (payerPhone.length < 9) {
      throw new Error('Un numéro Mobile Money valide est requis pour initier le paiement.');
    }

    const predictedProvider = await predictKPayProvider(payerPhone);
    const selectedCountry = String(link.client_country || '').toUpperCase();
    if (
      selectedCountry &&
      predictedProvider.country.toUpperCase() !== countryIso2ToIso3(selectedCountry)
    ) {
      throw new Error(
        'Le numéro Mobile Money ne correspond pas au pays sélectionné. Vérifiez les deux informations.'
      );
    }
    const currency = await resolveLinkCurrency(supabase, link);
    const charge = await buildKPayProviderAmount(
      Number(link.amount),
      currency,
      predictedProvider.provider,
      { minAmount: 50 }
    );
    const siteOrigin = (origin || 'http://localhost:5173').replace(/\/$/, '');
    // Nouveau externalId à chaque forceNew / session expirée pour éviter 409
    const externalId = `fidexa-pay-${link.id}-${Date.now()}`;

    const tx = await createKPayGatewayPayment({
      amount: charge.amount,
      externalId,
      returnUrl: `${siteOrigin}/pay/${linkId}?kpay=success`,
      cancelUrl: `${siteOrigin}/pay/${linkId}?kpay=cancel`,
      description: (link.description || 'Commande FidexaPay').slice(0, 500),
      provider: predictedProvider.provider,
      phoneNumber: predictedProvider.phoneNumber,
      metadata: {
        link_id: link.link_id,
        payment_link_id: link.id,
        customer_name: customerName || link.client_name || 'Client FidexaPay',
        customer_email: customerEmail || link.client_email || undefined,
        original_amount: String(charge.originalAmount),
        original_currency: charge.originalCurrency,
        api_amount: String(charge.amount),
        settlement_currency: charge.settlementCurrency,
        conversion_mode: charge.conversionMode,
        kpay_provider: predictedProvider.provider,
        kpay_provider_country: predictedProvider.country,
      },
    });

    const checkoutUrl = tx.gatewayUrl as string | undefined;
    const reference = tx.reference as string | undefined;
    const paymentId = tx.id as string | undefined;

    if (!reference || !paymentId) {
      console.error('KPay response missing reference/id:', tx);
      return new Response(JSON.stringify({ error: 'Réponse KPay invalide' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('payment_links')
      .update({
        kpay_reference: reference,
        kpay_payment_id: paymentId,
        kpay_status: tx.status || 'PENDING',
        kpay_checkout_url: checkoutUrl ?? null,
        kpay_amount: charge.amount,
        kpay_fees: tx.feeAmount ?? null,
        payment_method: 'kpay',
        currency,
        updated_at: now,
      })
      .eq('id', link.id);

    if (updateError) {
      console.error('DB update error:', updateError);
    }

    // Les versions déjà déployées du frontend attendent une URL de checkout.
    // Pour un paiement USSD, on les redirige vers la page Fidexa afin qu'elles
    // déclenchent immédiatement la vérification du paiement en attente.
    const paymentMode = checkoutUrl ? 'gateway' : 'ussd';
    const continuationUrl =
      checkoutUrl ??
      `${siteOrigin}/pay/${linkId}?kpay=success&reference=${encodeURIComponent(reference)}`;

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: continuationUrl,
        reference,
        paymentId,
        amount: charge.amount,
        currency: charge.settlementCurrency,
        provider: predictedProvider.provider,
        paymentMode,
        originalAmount: charge.originalAmount,
        originalCurrency: charge.originalCurrency,
        conversionMode: charge.conversionMode,
        fees: tx.feeAmount ?? null,
        environment: tx.isTest ? 'sandbox' : 'live',
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
