import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildKPayProviderAmount,
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

    const { data: rpcRaw, error: rpcErr } = await anon.rpc('admin_resolve_dispute', {
      dispute_id_param: disputeId,
      decision_param: decision,
      resolution_notes_param: resolutionNotes,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    const result = typeof rpcRaw === 'string' ? JSON.parse(rpcRaw) : rpcRaw;
    if (!result?.success) throw new Error(result?.error || 'Résolution impossible');

    const orderAmount = Number(result.amount || 0);
    const rate = Number(result.commission_rate || 15);
    // Source de vérité : toujours 85% client / 15% FidexaPay (jamais inverser)
    const commissionAmount = Number(
      (result.commission_amount != null
        ? result.commission_amount
        : Math.round(orderAmount * rate) / 100
      ).toFixed(2)
    );
    const refundable = Number(
      (result.refundable_amount != null
        ? result.refundable_amount
        : Math.round((orderAmount - commissionAmount) * 100) / 100
      ).toFixed(2)
    );
    if (!(refundable > commissionAmount) && orderAmount > 0) {
      // Garde-fou : le client doit recevoir plus que la commission retenue
      const expected = Math.round(orderAmount * (100 - rate)) / 100;
      if (Math.abs(refundable - expected) > 0.02) {
        throw new Error(
          `Montant remboursable incohérent (${refundable}). Attendu ≈ ${expected} (${100 - rate}% de ${orderAmount}).`
        );
      }
    }

    const decisionLabel =
      decision === 'refund_client'
        ? 'Remboursement accordé au client selon la politique FidexaPay'
        : 'Paiement libéré au prestataire selon la politique FidexaPay';

    const notifyBoth = async (extra?: Record<string, string>) => {
      const vars = {
        order_reference: result.link_id,
        client_name: result.client_name || 'Client',
        merchant_name: result.provider_name || 'Prestataire',
        decision_label: decisionLabel,
        resolution_notes: resolutionNotes,
        amount: String(orderAmount),
        currency: String(result.currency || ''),
        refundable_amount: String(refundable),
        reason: resolutionNotes,
        ...extra,
      };
      const jobs = [];
      if (result.client_phone) {
        jobs.push(
          dispatchNotificationEvent('dispute.resolved', {
            recipientPhone: result.client_phone,
            paymentLinkId: result.payment_link_id,
            idempotencyKey: `dispute-resolved:${disputeId}:client:${Date.now()}`,
            variables: vars,
          })
        );
      }
      if (result.provider_phone) {
        jobs.push(
          dispatchNotificationEvent('dispute.resolved', {
            recipientPhone: result.provider_phone,
            paymentLinkId: result.payment_link_id,
            idempotencyKey: `dispute-resolved:${disputeId}:provider:${Date.now()}`,
            variables: vars,
          })
        );
      }
      return Promise.all(jobs);
    };

    if (decision === 'pay_provider') {
      await notifyBoth();
      return new Response(JSON.stringify({ success: true, ...result, decision_label: decisionLabel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refundRequestId = result.refund_request_id as string;
    const phone = clientPhone || String(result.client_phone || '');
    if (!phone) throw new Error('Numéro Mobile Money du client requis pour le remboursement KPay');
    if (!Number.isFinite(refundable) || refundable <= 0) {
      throw new Error('Montant remboursable invalide');
    }
    if (providerCreditAmount < 0 || refundable + providerCreditAmount > refundable + 0.01) {
      // provider credit optional but must not exceed refundable envelope already net of commission
    }
    if (providerCreditAmount > 0 && providerCreditAmount + refundable > orderAmount - commissionAmount + 0.01) {
      throw new Error(
        `Le total client + crédit ne peut pas dépasser ${refundable} ${result.currency} (part FidexaPay ${rate}% retenue).`
      );
    }

    const { data: linkMeta } = await service
      .from('payment_links')
      .select('provider_id')
      .eq('id', result.payment_link_id)
      .maybeSingle();

    const existing = await service
      .from('refund_settlements')
      .select('id, status, kpay_payout_reference, failure_reason')
      .eq('refund_request_id', refundRequestId)
      .maybeSingle();

    if (existing.data?.status === 'completed') {
      await notifyBoth();
      return new Response(
        JSON.stringify({ success: true, ...result, reused: true, settlement: existing.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const kpayProvider = mapMobileMoneyProviderToKPay(clientProvider, clientCountry);
    // Conversion vers la devise de l'opérateur (ex. USD → CDF pour Airtel COD) — pas XAF par défaut
    const charge = await buildKPayProviderAmount(refundable, result.currency, kpayProvider, {
      minAmount: 1,
    });

    let settlementId = existing.data?.id as string | undefined;
    if (!settlementId) {
      const inserted = await service
        .from('refund_settlements')
        .insert({
          refund_request_id: refundRequestId,
          payment_link_id: result.payment_link_id,
          client_amount: refundable,
          provider_credit_amount: providerCreditAmount || 0,
          currency: result.currency || 'USD',
          client_phone: phone,
          client_provider: clientProvider,
          client_country: clientCountry,
          status: 'processing',
          approved_by: authData.user.id,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (inserted.error || !inserted.data?.id) {
        throw new Error(inserted.error?.message || 'Impossible de créer le règlement KPay');
      }
      settlementId = inserted.data.id;
    } else if (existing.data?.status === 'failed') {
      await service
        .from('refund_settlements')
        .update({
          status: 'processing',
          failure_reason: null,
          client_amount: refundable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);
    }

    const payout = await createKPayPayout({
      amount: charge.amount,
      provider: kpayProvider,
      phoneNumber: normalizePhoneKPay(phone, phonePrefixDigitsForCountry(clientCountry)),
      sourceCountry: countryIso2ToIso3(clientCountry),
      externalId: `fidexa-dispute-refund-${settlementId}-${Date.now()}`,
      description: `Remboursement client FidexaPay ${String(result.link_id).slice(0, 12)}`,
      metadata: {
        kind: 'client_refund',
        settlement_id: settlementId,
        refund_request_id: refundRequestId,
        payment_link_id: result.payment_link_id,
        dispute_id: disputeId,
        provider_id: linkMeta?.provider_id || '',
        provider_credit_amount: String(providerCreditAmount || 0),
        commission_amount: String(commissionAmount),
        refundable_original: String(refundable),
        refundable_currency: String(result.currency || ''),
        payout_amount: String(charge.amount),
        payout_currency: charge.settlementCurrency,
        admin_note: resolutionNotes,
      },
    });

    const payoutStatus = String(payout.status || 'PENDING').toUpperCase();
    const failed =
      payoutStatus === 'FAILED' || payoutStatus === 'CANCELLED' || Boolean(payout.failureReason);

    await service
      .from('refund_settlements')
      .update({
        status: failed ? 'failed' : payoutStatus === 'COMPLETED' ? 'completed' : 'processing',
        kpay_payout_id: String(payout.id || ''),
        kpay_payout_reference: String(payout.reference || ''),
        kpay_payout_status: payoutStatus,
        failure_reason: failed
          ? String(payout.failureReason || payout.message || 'Payout KPay échoué')
          : null,
        completed_at: payoutStatus === 'COMPLETED' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlementId);

    if (failed) {
      await service.from('order_timeline').insert({
        payment_link_id: result.payment_link_id,
        status: 'cancelled',
        action: 'Remboursement Mobile Money en échec',
        description:
          String(payout.failureReason || payout.message || 'Échec KPay') +
          `. Montant prévu: ${refundable} ${result.currency} (soit ${charge.amount} ${charge.settlementCurrency}). Réessayez depuis Admin → Remboursements.`,
        actor_type: 'system',
      });
      throw new Error(
        `KPay a refusé le payout: ${payout.failureReason || payout.message || payoutStatus}. ` +
          `Montant client: ${refundable} ${result.currency} → ${charge.amount} ${charge.settlementCurrency}.`
      );
    }

    if (payoutStatus === 'COMPLETED') {
      await service
        .from('payment_links')
        .update({
          refunded: true,
          refunded_at: new Date().toISOString(),
          commission_rate: rate,
          commission_amount: commissionAmount,
          net_amount: refundable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.payment_link_id);
      await service
        .from('refund_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', refundRequestId);
      await service
        .from('disputes')
        .update({
          refund_status: 'completed',
          refund_amount: refundable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);
    }

    await notifyBoth({
      decision_label:
        'FidexaPay a tranché en votre faveur. Un remboursement Mobile Money a été initié conformément à notre politique de litiges.',
    });

    if (result.provider_phone) {
      await dispatchNotificationEvent('dispute.resolved', {
        recipientPhone: result.provider_phone,
        paymentLinkId: result.payment_link_id,
        idempotencyKey: `dispute-refund-provider:${disputeId}`,
        variables: {
          order_reference: result.link_id,
          client_name: result.client_name || 'Client',
          merchant_name: result.provider_name || 'Prestataire',
          decision_label:
            'FidexaPay a tranché en faveur du client. Les fonds escrow ne seront pas libérés, conformément à la politique de litiges.',
          resolution_notes: resolutionNotes,
          amount: String(orderAmount),
          currency: String(result.currency || ''),
          refundable_amount: String(refundable),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        commission_amount: commissionAmount,
        refundable_amount: refundable,
        payout_amount: charge.amount,
        payout_currency: charge.settlementCurrency,
        settlementId,
        payout,
        message: `Remboursement initié: ${refundable} ${result.currency} au client (${charge.amount} ${charge.settlementCurrency}). Part FidexaPay: ${commissionAmount} ${result.currency}.`,
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
