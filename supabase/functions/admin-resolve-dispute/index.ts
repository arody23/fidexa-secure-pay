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
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

function errMsg(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return 'Erreur serveur';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const disputeId = String(body.disputeId || body.dispute_id || '').trim();
    const decision = String(body.decision || '').trim();
    const resolutionNotes = String(body.resolutionNotes || body.resolution || '').trim();
    const clientPhone = String(body.clientPhone || '').trim();
    const clientProvider = String(body.clientProvider || 'Airtel').trim();
    const clientCountry = String(body.clientCountry || 'CD').trim().toUpperCase();
    const providerCreditAmount = Number(body.providerCreditAmount || 0);

    if (!disputeId) throw new Error('disputeId requis');
    if (!['refund_client', 'pay_provider'].includes(decision)) {
      throw new Error('Décision invalide');
    }
    if (resolutionNotes.length < 3) throw new Error('Motivation de décision requise');

    const authHeader = req.headers.get('Authorization') || '';
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) throw new Error('Non authentifié');
    const { data: authData, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !authData.user) throw new Error('Session invalide');

    const { data: profile } = await service
      .from('users')
      .select('is_admin, role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!(profile?.is_admin || profile?.role === 'admin')) throw new Error('Accès admin requis');

    // RPC avec le JWT admin (auth.uid() dans la fonction)
    const { data: rpcRaw, error: rpcErr } = await anon.rpc('admin_resolve_dispute', {
      dispute_id_param: disputeId,
      decision_param: decision,
      resolution_notes_param: resolutionNotes,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    const result = typeof rpcRaw === 'string' ? JSON.parse(rpcRaw) : rpcRaw;
    if (!result?.success) throw new Error(result?.error || 'Résolution impossible');

    const decisionLabel =
      decision === 'refund_client'
        ? 'Remboursement client (commission FidexaPay conservée)'
        : 'Paiement prestataire (commission déduite)';

    const notifyBoth = async () => {
      const vars = {
        order_reference: result.link_id,
        client_name: result.client_name || 'Client',
        merchant_name: result.provider_name || 'Prestataire',
        decision_label: decisionLabel,
        resolution_notes: resolutionNotes,
        amount: String(result.amount ?? ''),
        currency: String(result.currency || ''),
        refundable_amount: String(result.refundable_amount ?? ''),
        reason: resolutionNotes,
      };
      const jobs = [];
      if (result.client_phone) {
        jobs.push(
          dispatchNotificationEvent('dispute.resolved', {
            recipientPhone: result.client_phone,
            paymentLinkId: result.payment_link_id,
            idempotencyKey: `dispute-resolved:${disputeId}:client`,
            variables: vars,
          })
        );
      }
      if (result.provider_phone) {
        jobs.push(
          dispatchNotificationEvent('dispute.resolved', {
            recipientPhone: result.provider_phone,
            paymentLinkId: result.payment_link_id,
            idempotencyKey: `dispute-resolved:${disputeId}:provider`,
            variables: vars,
          })
        );
      }
      return Promise.all(jobs);
    };

    if (decision === 'pay_provider') {
      await notifyBoth();
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // refund_client → payout KPay immédiat (max 85%)
    const refundRequestId = result.refund_request_id as string;
    const refundable = Number(result.refundable_amount);
    const phone = clientPhone || String(result.client_phone || '');
    if (!phone) throw new Error('Numéro Mobile Money du client requis pour le remboursement KPay');
    if (!Number.isFinite(refundable) || refundable <= 0) {
      throw new Error('Montant remboursable invalide');
    }
    const maxOut = Number(result.refundable_amount);
    if (providerCreditAmount < 0 || refundable + providerCreditAmount > maxOut + 0.01) {
      throw new Error(
        `Le total client + crédit ne peut pas dépasser ${maxOut} (commission ${result.commission_rate}% FidexaPay conservée)`
      );
    }

    const { data: linkMeta } = await service
      .from('payment_links')
      .select('provider_id')
      .eq('id', result.payment_link_id)
      .maybeSingle();

    const existing = await service
      .from('refund_settlements')
      .select('id, status, kpay_payout_reference')
      .eq('refund_request_id', refundRequestId)
      .maybeSingle();
    if (existing.data?.status === 'completed') {
      await notifyBoth();
      return new Response(
        JSON.stringify({ success: true, ...result, reused: true, settlement: existing.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const charge = buildKPayAmount(refundable, result.currency, { minAmount: 100 });
    const settlementRow = existing.data ?? (
      await service
        .from('refund_settlements')
        .insert({
          refund_request_id: refundRequestId,
          payment_link_id: result.payment_link_id,
          client_amount: refundable,
          provider_credit_amount: providerCreditAmount || 0,
          currency: result.currency || 'FCFA',
          client_phone: phone,
          client_provider: clientProvider,
          client_country: clientCountry,
          status: 'processing',
          approved_by: authData.user.id,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single()
    ).data;
    if (!settlementRow?.id) throw new Error('Impossible de créer le règlement KPay');

    const payout = await createKPayPayout({
      amount: charge.amount,
      provider: mapMobileMoneyProviderToKPay(clientProvider, clientCountry),
      phoneNumber: normalizePhoneKPay(phone, phonePrefixDigitsForCountry(clientCountry)),
      sourceCountry: countryIso2ToIso3(clientCountry),
      externalId: `fidexa-dispute-refund-${settlementRow.id}`,
      description: `Remboursement litige Fidexa ${String(result.link_id).slice(0, 12)}`,
      metadata: {
        kind: 'client_refund',
        settlement_id: settlementRow.id,
        refund_request_id: refundRequestId,
        payment_link_id: result.payment_link_id,
        dispute_id: disputeId,
        provider_id: linkMeta?.provider_id || '',
        provider_credit_amount: String(providerCreditAmount || 0),
        commission_amount: String(result.commission_amount || 0),
        admin_note: resolutionNotes,
      },
    });

    await service
      .from('refund_settlements')
      .update({
        status: String(payout.status || 'PENDING').toLowerCase() === 'completed' ? 'completed' : 'processing',
        kpay_payout_id: String(payout.id || ''),
        kpay_payout_reference: String(payout.reference || ''),
        kpay_payout_status: String(payout.status || 'PENDING'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlementRow.id);

    // Si KPay confirme immédiatement
    if (String(payout.status || '').toUpperCase() === 'COMPLETED') {
      await service
        .from('payment_links')
        .update({
          refunded: true,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.payment_link_id);
      await service
        .from('refund_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', refundRequestId);
    }

    await notifyBoth();

    // Notif remboursement initié au client
    if (phone) {
      await dispatchNotificationEvent('refund.requested', {
        recipientPhone: phone,
        paymentLinkId: result.payment_link_id,
        idempotencyKey: `dispute-refund-init:${disputeId}:client`,
        variables: {
          order_reference: result.link_id,
          client_name: result.client_name || 'Client',
          merchant_name: result.provider_name || 'Prestataire',
          amount: String(refundable),
          currency: String(result.currency || ''),
        },
      });
    }
    if (result.provider_phone) {
      await dispatchNotificationEvent('dispute.resolved', {
        recipientPhone: result.provider_phone,
        paymentLinkId: result.payment_link_id,
        idempotencyKey: `dispute-refund-init:${disputeId}:provider-info`,
        variables: {
          order_reference: result.link_id,
          client_name: result.client_name || 'Client',
          merchant_name: result.provider_name || 'Prestataire',
          decision_label: `Remboursement client de ${refundable} ${result.currency} (commission FidexaPay ${result.commission_rate}% conservée)`,
          resolution_notes: resolutionNotes,
          amount: String(result.amount ?? ''),
          currency: String(result.currency || ''),
          refundable_amount: String(refundable),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        settlementId: settlementRow.id,
        payout,
        message: `Remboursement KPay initié: ${refundable} ${result.currency} (commission ${result.commission_amount} conservée)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('admin-resolve-dispute', err);
    return new Response(JSON.stringify({ success: false, error: errMsg(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
