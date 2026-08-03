import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildKPayAmount,
  countryIso2ToIso3,
  corsHeaders,
  createKPayPayout,
  mapMobileMoneyProviderToKPay,
  normalizePhoneKPay,
  phonePrefixDigitsForCountry,
} from '../_shared/kpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!token) throw new Error('Non authentifié');
    const { data: { user } } = await db.auth.getUser(token);
    const { data: admin } = await db.from('users').select('is_admin, role').eq('id', user?.id).maybeSingle();
    if (!user || !(admin?.is_admin || admin?.role === 'admin')) throw new Error('Accès admin requis');

    const { amount, currency, phone, provider, country = 'CD', description } = await req.json();
    if (!amount || !currency || !phone || !provider) throw new Error('Montant, devise, numéro et opérateur requis');
    const normalizedCountry = String(country).toUpperCase();
    const money = buildKPayAmount(Number(amount), String(currency), { minAmount: 100 });
    const { data: withdrawal, error } = await db.from('company_withdrawals').insert({
      amount: money.amount,
      currency: String(currency).toUpperCase(),
      recipient_phone: phone,
      recipient_provider: provider,
      source_country: normalizedCountry,
      description: description || null,
      status: 'processing',
      requested_by: user.id,
    }).select('id').single();
    if (error || !withdrawal) throw new Error('Création du retrait entreprise impossible');

    const payout = await createKPayPayout({
      amount: money.amount,
      provider: mapMobileMoneyProviderToKPay(provider, normalizedCountry),
      phoneNumber: normalizePhoneKPay(phone, phonePrefixDigitsForCountry(normalizedCountry)),
      sourceCountry: countryIso2ToIso3(normalizedCountry),
      externalId: `fidexa-company-${withdrawal.id}`,
      description: description || 'Retrait entreprise Fidexa',
      metadata: { kind: 'company_withdrawal', company_withdrawal_id: withdrawal.id },
    });
    await db.from('company_withdrawals').update({
      kpay_payout_id: String(payout.id || ''),
      kpay_payout_reference: String(payout.reference || ''),
      kpay_payout_status: String(payout.status || 'PENDING'),
      updated_at: new Date().toISOString(),
    }).eq('id', withdrawal.id);
    return new Response(JSON.stringify({ success: true, withdrawalId: withdrawal.id, payout }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
