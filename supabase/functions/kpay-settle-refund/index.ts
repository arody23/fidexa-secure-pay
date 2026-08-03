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

async function requireAdmin(req: Request, db: ReturnType<typeof createClient>) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Non authentifié');
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new Error('Session invalide');
  const { data: profile } = await db.from('users').select('is_admin, role').eq('id', user.id).maybeSingle();
  if (!(profile?.is_admin || profile?.role === 'admin')) throw new Error('Accès admin requis');
  return user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const {
      refundRequestId,
      clientAmount,
      providerCreditAmount = 0,
      clientPhone,
      clientProvider,
      clientCountry = 'CD',
      adminNote,
    } = await req.json();
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const admin = await requireAdmin(req, db);
    const refund = await db
      .from('refund_requests')
      .select('id, payment_link_id, status, payment_links(id, amount, currency, provider_id, client_phone)')
      .eq('id', refundRequestId)
      .single();
    if (refund.error || !refund.data) throw new Error('Demande de remboursement introuvable');
    const request = refund.data as any;
    const link = request.payment_links;
    if (!link?.id || !['approved', 'under_review', 'awaiting_provider', 'awaiting_client', 'pending'].includes(request.status)) {
      throw new Error('Demande de remboursement non éligible');
    }
    const client = Number(clientAmount);
    const providerCredit = Number(providerCreditAmount || 0);
    const paid = Number(link.amount || 0);
    const distributable = Math.round(paid * 85 * 100) / 100;
    if (!Number.isFinite(client) || client <= 0 || !Number.isFinite(providerCredit) || providerCredit < 0) {
      throw new Error('Montants invalides');
    }
    if (client + providerCredit > distributable) {
      throw new Error(`Le total client + prestataire ne peut pas dépasser ${distributable}`);
    }
    if (!clientPhone || !clientProvider) throw new Error('Numéro et opérateur Mobile Money du client requis');

    const existing = await db
      .from('refund_settlements')
      .select('id, status, kpay_payout_reference')
      .eq('refund_request_id', request.id)
      .maybeSingle();
    if (existing.data?.status === 'completed') {
      return new Response(JSON.stringify({ success: true, reused: true, settlement: existing.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const country = String(clientCountry).toUpperCase();
    const charge = buildKPayAmount(client, link.currency, { minAmount: 100 });
    const settlement = existing.data ?? (
      await db.from('refund_settlements').insert({
        refund_request_id: request.id,
        payment_link_id: link.id,
        client_amount: client,
        provider_credit_amount: providerCredit,
        currency: link.currency || 'FCFA',
        client_phone: clientPhone,
        client_provider: clientProvider,
        client_country: country,
        status: 'processing',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      }).select('id').single()
    ).data;
    if (!settlement?.id) throw new Error('Impossible de créer le règlement');

    const payout = await createKPayPayout({
      amount: charge.amount,
      provider: mapMobileMoneyProviderToKPay(clientProvider, country),
      phoneNumber: normalizePhoneKPay(clientPhone, phonePrefixDigitsForCountry(country)),
      sourceCountry: countryIso2ToIso3(country),
      externalId: `fidexa-refund-${settlement.id}`,
      description: `Remboursement Fidexa ${link.id.slice(0, 8)}`,
      metadata: {
        kind: 'client_refund',
        settlement_id: settlement.id,
        refund_request_id: request.id,
        payment_link_id: link.id,
        provider_id: link.provider_id,
        provider_credit_amount: String(providerCredit),
        admin_note: adminNote || '',
      },
    });
    await db.from('refund_settlements').update({
      status: String(payout.status || 'PENDING').toLowerCase() === 'completed' ? 'completed' : 'processing',
      kpay_payout_id: String(payout.id || ''),
      kpay_payout_reference: String(payout.reference || ''),
      kpay_payout_status: String(payout.status || 'PENDING'),
      updated_at: new Date().toISOString(),
    }).eq('id', settlement.id);
    return new Response(JSON.stringify({ success: true, settlementId: settlement.id, payout }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
