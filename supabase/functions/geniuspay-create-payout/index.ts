import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  amountForGeniusPay,
  applyWithdrawalPayoutUpdate,
  corsHeaders,
  createGeniusPayPayout,
  fetchGeniusPayPayout,
  fetchGeniusPayPayoutWallet,
  mapMobileMoneyProviderToGeniusPay,
  normalizePhoneE164,
} from '../_shared/geniuspay.ts';

const PHONE_PREFIX: Record<string, string> = {
  CD: '+243',
  CG: '+242',
  CI: '+225',
  BJ: '+229',
  CM: '+237',
  TG: '+228',
};

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
        'id, user_id, amount, currency, method, mobile_money_provider, phone_number, status, geniuspay_payout_reference, account_details'
      )
      .eq('id', withdrawalId)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Retrait introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (withdrawal.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Seules les demandes en attente peuvent être payées automatiquement' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (withdrawal.geniuspay_payout_reference) {
      const existing = await fetchGeniusPayPayout(withdrawal.geniuspay_payout_reference);
      return new Response(
        JSON.stringify({
          success: true,
          reused: true,
          reference: existing.reference ?? withdrawal.geniuspay_payout_reference,
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

    const country = (providerUser?.country || 'CD').toUpperCase();
    const phonePrefix = PHONE_PREFIX[country] ?? '+243';
    const phone = normalizePhoneE164(withdrawal.phone_number, phonePrefix);
    const converted = amountForGeniusPay(Number(withdrawal.amount), withdrawal.currency);
    const gpProvider = mapMobileMoneyProviderToGeniusPay(withdrawal.mobile_money_provider);
    const wallet = await fetchGeniusPayPayoutWallet();

    const payout = await createGeniusPayPayout({
      walletId: wallet.id,
      recipientName: providerUser?.full_name || 'Prestataire FidexaPay',
      recipientPhone: phone,
      recipientEmail: providerUser?.email,
      provider: gpProvider,
      account: phone,
      amountXof: converted.amountXof,
      description: `Retrait FidexaPay ${withdrawal.id.slice(0, 8)}`,
      idempotencyKey: `fidexa-withdrawal-${withdrawal.id}`,
      metadata: {
        withdrawal_id: withdrawal.id,
        user_id: withdrawal.user_id,
        original_amount: String(converted.originalAmount),
        original_currency: converted.originalCurrency,
      },
    });

    const reference = payout.reference as string;
    const payoutStatus = (payout.status as string) || 'pending';
    const fees = payout.fees != null ? Number(payout.fees) : null;

    const { finalStatus } = await applyWithdrawalPayoutUpdate(serviceSupabase, withdrawal.id, {
      reference,
      payoutId: payout.id != null ? String(payout.id) : null,
      status: payoutStatus,
      fees,
      amountXof: converted.amountXof,
      adminId: adminUser.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        payoutStatus,
        withdrawalStatus: finalStatus,
        amountXof: converted.amountXof,
        originalAmount: converted.originalAmount,
        originalCurrency: converted.originalCurrency,
        fees,
        provider: gpProvider,
        phone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('geniuspay-create-payout error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
