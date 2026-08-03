import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  applyWithdrawalPayoutUpdate,
  markLinkPaid,
  verifyWebhookSignature,
} from '../_shared/kpay.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

type SupabaseClient = ReturnType<typeof createClient>;

async function handlePayoutEvent(
  supabase: SupabaseClient,
  eventType: string,
  event: Record<string, unknown>
) {
  const reference = (event.reference as string) || '';
  const paymentId = (event.paymentId as string) || '';
  const metadata = (event.metadata as Record<string, unknown>) ?? {};
  const withdrawalId = metadata.withdrawal_id as string | undefined;
  const status = String(event.status ?? '').toUpperCase();

  let withdrawal: { id: string; status: string } | null = null;

  if (withdrawalId) {
    const { data: row } = await supabase
      .from('withdrawals')
      .select('id, status')
      .eq('id', withdrawalId)
      .maybeSingle();
    withdrawal = row;
  } else if (paymentId) {
    const { data: row } = await supabase
      .from('withdrawals')
      .select('id, status')
      .eq('kpay_payout_id', paymentId)
      .maybeSingle();
    withdrawal = row;
  } else if (reference) {
    const { data: row } = await supabase
      .from('withdrawals')
      .select('id, status')
      .eq('kpay_payout_reference', reference)
      .maybeSingle();
    withdrawal = row;
  } else if (event.externalId) {
    const externalId = String(event.externalId);
    const wdId = externalId.startsWith('fidexa-wd-')
      ? externalId.replace('fidexa-wd-', '')
      : null;
    if (wdId) {
      const { data: row } = await supabase
        .from('withdrawals')
        .select('id, status')
        .eq('id', wdId)
        .maybeSingle();
      withdrawal = row;
    }
  }

  if (!withdrawal) {
    return { ok: true, skipped: true, reason: 'withdrawal_not_found' };
  }

  if (eventType === 'payout.completed' || status === 'COMPLETED') {
    if (withdrawal.status !== 'completed') {
      await applyWithdrawalPayoutUpdate(supabase, withdrawal.id, {
        reference,
        payoutId: paymentId || null,
        status: 'COMPLETED',
        fees: event.amount != null ? null : null,
        finalStatus: 'completed',
      });
    }
  } else if (
    eventType === 'payout.failed' ||
    eventType === 'payout.cancelled' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  ) {
    await applyWithdrawalPayoutUpdate(supabase, withdrawal.id, {
      reference,
      payoutId: paymentId || null,
      status: status || 'FAILED',
      finalStatus: 'failed',
      notifyMessage: `Votre retrait a échoué : ${(event.failureReason as string) || 'contactez le support'}`,
    });
  } else {
    await supabase
      .from('withdrawals')
      .update({
        kpay_payout_status: (status || eventType.replace('payout.', '')).toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawal.id);
  }

  return { ok: true };
}

async function handlePaymentEvent(
  supabase: SupabaseClient,
  eventType: string,
  event: Record<string, unknown>
) {
  const reference = (event.reference as string) || '';
  const paymentId = (event.paymentId as string) || '';
  const metadata = (event.metadata as Record<string, unknown>) ?? {};
  const linkDbId = metadata.payment_link_id as string | undefined;
  const linkId = metadata.link_id as string | undefined;
  const status = String(event.status ?? '').toUpperCase();

  let link: { id: string; is_paid: boolean } | null = null;

  if (linkDbId) {
    const { data } = await supabase
      .from('payment_links')
      .select('id, is_paid')
      .eq('id', linkDbId)
      .maybeSingle();
    link = data;
  } else if (linkId) {
    const { data } = await supabase
      .from('payment_links')
      .select('id, is_paid')
      .eq('link_id', linkId)
      .maybeSingle();
    link = data;
  } else if (paymentId) {
    const { data } = await supabase
      .from('payment_links')
      .select('id, is_paid')
      .eq('kpay_payment_id', paymentId)
      .maybeSingle();
    link = data;
  } else if (reference) {
    const { data } = await supabase
      .from('payment_links')
      .select('id, is_paid')
      .eq('kpay_reference', reference)
      .maybeSingle();
    link = data;
  }

  if (!link) {
    return { ok: true, skipped: true, reason: 'link_not_found' };
  }

  if (eventType === 'payment.completed' || status === 'COMPLETED') {
    if (!link.is_paid) {
      await markLinkPaid(supabase, link.id, {
        reference: reference || paymentId,
        kpayPaymentId: paymentId || null,
        status: 'COMPLETED',
        gateway: (event.phoneNumber as string) || null,
      });
    }
  } else if (
    eventType === 'payment.failed' ||
    eventType === 'payment.cancelled' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  ) {
    await supabase
      .from('payment_links')
      .update({
        kpay_status: eventType === 'payment.cancelled' || status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id);
  }

  return { ok: true };
}

async function handleRefundEvent(
  supabase: SupabaseClient,
  eventType: string,
  event: Record<string, unknown>
) {
  const reference = (event.reference as string) || '';
  const refundId = (event.paymentId as string) || '';
  const metadata = (event.metadata as Record<string, unknown>) ?? {};
  const linkDbId = metadata.payment_link_id as string | undefined;
  const linkId = metadata.link_id as string | undefined;
  const status = String(event.status ?? '').toUpperCase();

  let link: {
    id: string;
    link_id: string;
    is_paid: boolean;
    refunded: boolean | null;
    kpay_reference: string | null;
    client_name: string | null;
    client_phone: string | null;
    amount: number | null;
    currency: string | null;
    provider_id: string | null;
  } | null = null;

  const fields =
    'id, link_id, is_paid, refunded, kpay_reference, client_name, client_phone, amount, currency, provider_id';

  if (linkDbId) {
    const { data } = await supabase.from('payment_links').select(fields).eq('id', linkDbId).maybeSingle();
    link = data;
  } else if (linkId) {
    const { data } = await supabase.from('payment_links').select(fields).eq('link_id', linkId).maybeSingle();
    link = data;
  } else if (reference) {
    const { data } = await supabase
      .from('payment_links')
      .select(fields)
      .eq('kpay_reference', reference)
      .maybeSingle();
    link = data;
  }

  if (!link) {
    return { ok: true, skipped: true, reason: 'refund_payment_link_not_found' };
  }

  const completed = eventType === 'refund.completed' || status === 'COMPLETED';
  const failed =
    eventType === 'refund.failed' ||
    eventType === 'refund.cancelled' ||
    status === 'FAILED' ||
    status === 'CANCELLED';
  const refundStatus = completed ? 'COMPLETED' : failed ? status || eventType.replace('refund.', '').toUpperCase() : status;
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    kpay_refund_reference: reference || null,
    kpay_refund_id: refundId || null,
    kpay_refund_status: refundStatus || 'PENDING',
    kpay_refund_amount: event.amount ?? null,
    updated_at: now,
  };

  if (completed) {
    update.refunded = true;
    update.refunded_at = now;
    update.status = 'cancelled';
    update.order_status = 'cancelled';
    update.cancelled_at = now;
  }

  const { error: updateError } = await supabase.from('payment_links').update(update).eq('id', link.id);
  if (updateError) throw new Error(`Mise à jour remboursement échouée: ${updateError.message}`);

  const requestStatus = completed ? 'completed' : failed ? 'failed' : null;
  if (requestStatus) {
    await supabase
      .from('refund_requests')
      .update({ status: requestStatus, updated_at: now })
      .eq('payment_link_id', link.id)
      .in('status', ['approved', 'pending', 'awaiting_provider', 'awaiting_client', 'under_review']);
  }

  if (completed && !link.refunded) {
    await supabase.from('order_timeline').insert({
      payment_link_id: link.id,
      status: 'cancelled',
      action: 'Remboursement KPay effectué',
      description: `Remboursement confirmé par KPay (${reference || refundId || 'sans référence'})`,
      actor_type: 'system',
    });
  }

  if ((completed || failed) && link.client_phone) {
    const merchant = link.provider_id
      ? await supabase.from('users').select('full_name').eq('id', link.provider_id).maybeSingle()
      : { data: null };
    const notification = await dispatchNotificationEvent(
      completed ? 'refund.completed' : 'refund.failed',
      {
        recipientPhone: link.client_phone,
        idempotencyKey: `kpay-refund:${link.id}:${refundId || reference}:${completed ? 'completed' : 'failed'}`,
        variables: {
          client_name: link.client_name || 'Client',
          merchant_name: merchant.data?.full_name || 'Prestataire',
          amount: String(event.amount ?? link.amount ?? ''),
          currency: String(link.currency || 'FCFA'),
          order_reference: reference || link.kpay_reference || link.link_id,
          transaction_id: refundId || reference,
        },
      }
    );
    console.log('[kpay-webhook] refund notification', notification);
  }

  return { ok: true, status: refundStatus || 'PENDING' };
}

async function handleClientRefundPayout(
  supabase: SupabaseClient,
  eventType: string,
  event: Record<string, unknown>
) {
  const metadata = (event.metadata as Record<string, unknown>) ?? {};
  const settlementId = String(metadata.settlement_id || '');
  if (!settlementId) return { ok: true, skipped: true, reason: 'refund_settlement_missing' };
  const status = String(event.status ?? '').toUpperCase();
  const completed = eventType === 'payout.completed' || status === 'COMPLETED';
  const failed =
    eventType === 'payout.failed' ||
    eventType === 'payout.cancelled' ||
    status === 'FAILED' ||
    status === 'CANCELLED';
  const { data: settlement } = await supabase
    .from('refund_settlements')
    .select('id, payment_link_id, refund_request_id, provider_credit_amount, status')
    .eq('id', settlementId)
    .maybeSingle();
  if (!settlement) return { ok: true, skipped: true, reason: 'refund_settlement_not_found' };

  const now = new Date().toISOString();
  await supabase
    .from('refund_settlements')
    .update({
      status: completed ? 'completed' : failed ? 'failed' : 'processing',
      kpay_payout_id: String(event.paymentId || ''),
      kpay_payout_reference: String(event.reference || ''),
      kpay_payout_status: status || eventType,
      failure_reason: failed ? String(event.failureReason || 'Remboursement non abouti') : null,
      completed_at: completed ? now : null,
      updated_at: now,
    })
    .eq('id', settlement.id);

  if (!completed) return { ok: true };
  await supabase
    .from('payment_links')
    .update({ refunded: true, refunded_at: now, status: 'cancelled', order_status: 'cancelled', updated_at: now })
    .eq('id', settlement.payment_link_id);
  await supabase
    .from('refund_requests')
    .update({ status: 'completed', updated_at: now })
    .eq('id', settlement.refund_request_id);

  const providerId = String(metadata.provider_id || '');
  const credit = Number(settlement.provider_credit_amount || 0);
  if (providerId && credit > 0) {
    await supabase.from('provider_wallet_credits').upsert(
      {
        provider_id: providerId,
        payment_link_id: settlement.payment_link_id,
        refund_settlement_id: settlement.id,
        amount: credit,
        currency: String(event.currency || 'FCFA'),
        reason: 'Compensation prestataire décidée par l’admin',
      },
      { onConflict: 'refund_settlement_id' }
    );
  }
  return { ok: true };
}

async function handleCompanyWithdrawalPayout(
  supabase: SupabaseClient,
  eventType: string,
  event: Record<string, unknown>
) {
  const metadata = (event.metadata as Record<string, unknown>) ?? {};
  const id = String(metadata.company_withdrawal_id || '');
  if (!id) return { ok: true, skipped: true };
  const status = String(event.status ?? '').toUpperCase();
  const completed = eventType === 'payout.completed' || status === 'COMPLETED';
  const failed = eventType === 'payout.failed' || eventType === 'payout.cancelled' || ['FAILED', 'CANCELLED'].includes(status);
  await supabase.from('company_withdrawals').update({
    status: completed ? 'completed' : failed ? 'failed' : 'processing',
    kpay_payout_id: String(event.paymentId || ''),
    kpay_payout_reference: String(event.reference || ''),
    kpay_payout_status: status || eventType,
    failure_reason: failed ? String(event.failureReason || 'Retrait non abouti') : null,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const signature =
    req.headers.get('X-KPAY-Signature') ??
    req.headers.get('x-kpay-signature');

  try {
    const valid = await verifyWebhookSignature(body, signature);
    if (!valid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body) as Record<string, unknown>;
    const eventType = String(
      event.event ?? req.headers.get('X-KPAY-Event') ?? req.headers.get('x-kpay-event') ?? ''
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (eventType.startsWith('payout.') || eventType.startsWith('refund.')) {
      if (eventType.startsWith('refund.')) {
        const result = await handleRefundEvent(supabase, eventType, event);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if ((event.metadata as Record<string, unknown> | undefined)?.kind === 'client_refund') {
        const result = await handleClientRefundPayout(supabase, eventType, event);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if ((event.metadata as Record<string, unknown> | undefined)?.kind === 'company_withdrawal') {
        const result = await handleCompanyWithdrawalPayout(supabase, eventType, event);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const result = await handlePayoutEvent(supabase, eventType, event);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (eventType.startsWith('payment.')) {
      const result = await handlePaymentEvent(supabase, eventType, event);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback : statut COMPLETED sans préfixe clair
    if (String(event.status).toUpperCase() === 'COMPLETED' && event.paymentId) {
      const result = await handlePaymentEvent(supabase, 'payment.completed', event);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'unknown_event' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('KPay webhook error:', err);
    return new Response(JSON.stringify({ error: 'Webhook failed' }), { status: 500 });
  }
});
