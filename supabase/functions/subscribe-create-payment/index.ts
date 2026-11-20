import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildKPayAmount,
  corsHeaders,
  createKPayGatewayPayment,
  predictKPayProvider,
} from '../_shared/kpay.ts';
import {
  commissionForPlan,
  normalizePlanId,
  periodEndIso,
  planPriceUsd,
  resolveCatalogPlanId,
  type BillingCycle,
  type PlanId,
} from '../_shared/subscriptions.ts';

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

    const body = await req.json();
    const plan = normalizePlanId(body.planId);
    const cycle = (body.cycle === 'yearly' ? 'yearly' : 'monthly') as BillingCycle;
    const phoneNumber = String(body.phoneNumber || '').replace(/\D/g, '');
    const origin = String(body.origin || 'https://fidexa-secure-pay.vercel.app').replace(/\/$/, '');

    if (plan === 'basique') {
      return new Response(JSON.stringify({ error: 'Basique est gratuit — pas de paiement' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (phoneNumber.length < 9) {
      return new Response(JSON.stringify({ error: 'Numéro Mobile Money requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountUsd = planPriceUsd(plan as PlanId, cycle);
    const charge = buildKPayAmount(amountUsd, 'USD', { minAmount: 50 });
    const predicted = await predictKPayProvider(phoneNumber);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const catalog = await resolveCatalogPlanId(supabase, plan as PlanId);
    if (!catalog) {
      throw new Error(
        `Plan catalogue introuvable (${plan}). Vérifiez la table subscription_plans.`
      );
    }

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = periodEndIso(cycle, now);
    const externalId = `fidexa-sub-${user.id}-${plan}-${Date.now()}`;
    const { data: subRow, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        provider_id: user.id,
        plan_id: catalog.id,
        plan_name: catalog.displayName,
        plan,
        cycle,
        amount_usd: amountUsd,
        amount_paid: amountUsd,
        commission_rate: commissionForPlan(plan as PlanId),
        status: 'pending',
        source: 'direct',
        payment_method: 'mobile_money',
        momo_phone: predicted.phoneNumber,
        start_date: periodStart,
        end_date: periodEnd,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select('id')
      .single();

    if (subErr || !subRow) {
      throw new Error(subErr?.message || 'Impossible de créer l’abonnement');
    }

    const checkoutPage = `${origin}/abonnement/paiement/${subRow.id}`;
    const tx = await createKPayGatewayPayment({
      amount: charge.amount,
      externalId,
      returnUrl: `${checkoutPage}?result=success`,
      cancelUrl: `${checkoutPage}?result=cancel`,
      description: `FidexaPay ${plan} (${cycle})`.slice(0, 500),
      provider: predicted.provider,
      phoneNumber: predicted.phoneNumber,
      metadata: {
        type: 'subscription',
        subscription_id: subRow.id,
        user_id: user.id,
        plan,
        cycle,
        amount_usd: String(amountUsd),
        api_amount: String(charge.amount),
        settlement_currency: charge.settlementCurrency,
        momo_phone: predicted.phoneNumber,
      },
    });

    const paymentRef = (tx.reference as string) || externalId;
    const paymentId = tx.id as string | undefined;
    const checkoutUrl = tx.gatewayUrl as string | undefined;

    await supabase
      .from('subscriptions')
      .update({
        payment_ref: paymentRef,
        checkout_url: checkoutUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subRow.id);

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subRow.id,
        statusPageUrl: checkoutPage,
        checkoutUrl: checkoutUrl || null,
        reference: paymentRef,
        paymentId,
        amount: charge.amount,
        currency: charge.settlementCurrency,
        amountUsd,
        paymentMode: checkoutUrl ? 'gateway' : 'ussd',
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
