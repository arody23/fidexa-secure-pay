import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  applyWithdrawalPayoutUpdate,
  buildKPayAmount,
  countryIso2ToIso3,
  corsHeaders,
  createKPayPayout,
  fetchKPayPayout,
  mapMobileMoneyProviderToKPay,
  normalizePhoneKPay,
  phonePrefixDigitsForCountry,
} from '../_shared/kpay.ts';

async function assertAdmin(req: Request, serviceSupabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Non authentifié');
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await serviceSupabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Session invalide');
  }

  const { data: profile } = await serviceSupabase
    .from('users')
    .select('is_admin, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    profile?.is_admin === true ||
    profile?.role === 'admin' ||
    user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    throw new Error('Accès admin requis');
  }

  return user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { withdrawalId } = await req.json();

    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: 'withdrawalId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const adminUser = await assertAdmin(req, serviceSupabase);

    const { data: withdrawal, error: wErr } = await serviceSupabase
      .from('withdrawals')
      .select(
        'id, user_id, amount, currency, method, mobile_money_provider, phone_number, status, kpay_payout_id, kpay_payout_reference, account_details'
      )
      .eq('id', withdrawalId)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Retrait introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return new Response(
        JSON.stringify({
          error: 'Seules les demandes en attente ou en cours peuvent être payées automatiquement',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (withdrawal.kpay_payout_id) {
      const existing = await fetchKPayPayout(withdrawal.kpay_payout_id);
      return new Response(
        JSON.stringify({
          success: true,
          reused: true,
          reference: existing.reference ?? withdrawal.kpay_payout_reference,
          paymentId: existing.id ?? withdrawal.kpay_payout_id,
          status: existing.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (withdrawal.method !== 'mobile_money') {
      return new Response(
        JSON.stringify({
          error:
            'Payout automatique disponible uniquement pour Mobile Money. Utilisez le flux manuel pour les virements bancaires.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!withdrawal.phone_number || !withdrawal.mobile_money_provider) {
      return new Response(JSON.stringify({ error: 'Numéro ou opérateur Mobile Money manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: providerUser } = await serviceSupabase
      .from('users')
      .select('full_name, email, country')
      .eq('id', withdrawal.user_id)
      .maybeSingle();

    const countryIso2 = (providerUser?.country || 'CD').toUpperCase();
    const phoneDigits = normalizePhoneKPay(
      withdrawal.phone_number,
      phonePrefixDigitsForCountry(countryIso2)
    );
    const charge = buildKPayAmount(Number(withdrawal.amount), withdrawal.currency, {
      minAmount: 100,
    });
    const kpayProvider = mapMobileMoneyProviderToKPay(
      withdrawal.mobile_money_provider,
      countryIso2
    );
    const sourceCountry = countryIso2ToIso3(countryIso2);
    const externalId = `fidexa-wd-${withdrawal.id}`;

    const payout = await createKPayPayout({
      amount: charge.amount,
      provider: kpayProvider,
      phoneNumber: phoneDigits,
      externalId,
      description: `Retrait FidexaPay ${withdrawal.id.slice(0, 8)}`,
      sourceCountry,
      metadata: {
        withdrawal_id: withdrawal.id,
        user_id: withdrawal.user_id,
        original_amount: String(charge.originalAmount),
        original_currency: charge.originalCurrency,
        recipient_name: providerUser?.full_name || 'Prestataire FidexaPay',
      },
    });

    const reference = payout.reference as string;
    const payoutStatus = (payout.status as string) || 'PENDING';
    const fees = payout.feeAmount != null ? Number(payout.feeAmount) : null;

    const { finalStatus } = await applyWithdrawalPayoutUpdate(serviceSupabase, withdrawal.id, {
      reference,
      payoutId: payout.id != null ? String(payout.id) : null,
      status: payoutStatus,
      fees,
      amount: charge.amount,
      adminId: adminUser.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        paymentId: payout.id,
        payoutStatus,
        withdrawalStatus: finalStatus,
        amount: charge.amount,
        originalAmount: charge.originalAmount,
        originalCurrency: charge.originalCurrency,
        fees,
        provider: kpayProvider,
        phone: phoneDigits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('kpay-create-payout error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
