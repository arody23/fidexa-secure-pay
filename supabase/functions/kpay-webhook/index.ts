import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  applyWithdrawalPayoutUpdate,
  markLinkPaid,
  verifyWebhookSignature,
} from '../_shared/kpay.ts';

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
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'refund_ignored' }), {
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
