import { createClient } from 'jsr:@supabase/supabase-js@2';

import { applyWithdrawalPayoutUpdate, markLinkPaid, verifyWebhookSignature } from '../_shared/geniuspay.ts';



type SupabaseClient = ReturnType<typeof createClient>;



async function handleWithdrawalCashoutEvent(

  supabase: SupabaseClient,

  eventType: string,

  event: Record<string, unknown>

) {

  const data = (event.data as Record<string, unknown>) ?? {};

  const cashout =

    (data.cashout as Record<string, unknown>) ??

    (data.payout as Record<string, unknown>) ??

    data;

  const reference = (cashout.reference as string) ?? (data.reference as string);

  const metadata = (cashout.metadata as Record<string, unknown>) ?? (data.metadata as Record<string, unknown>) ?? {};

  const withdrawalId = metadata.withdrawal_id as string | undefined;



  let withdrawal: { id: string; status: string } | null = null;



  if (withdrawalId) {

    const { data: row } = await supabase

      .from('withdrawals')

      .select('id, status')

      .eq('id', withdrawalId)

      .maybeSingle();

    withdrawal = row;

  } else if (reference) {

    const { data: row } = await supabase

      .from('withdrawals')

      .select('id, status')

      .eq('geniuspay_payout_reference', reference)

      .maybeSingle();

    withdrawal = row;

  }



  if (!withdrawal) {

    return { ok: true, skipped: true, reason: 'withdrawal_not_found' };

  }



  const status = String(cashout.status ?? data.status ?? '').toLowerCase();



  if (

    eventType === 'cashout.completed' ||

    eventType === 'payout.completed' ||

    status === 'completed'

  ) {

    if (withdrawal.status !== 'completed') {

      await applyWithdrawalPayoutUpdate(supabase, withdrawal.id, {

        reference: reference || '',

        payoutId: cashout.id != null ? String(cashout.id) : null,

        status: 'completed',

        fees: cashout.fees != null ? Number(cashout.fees) : null,

        finalStatus: 'completed',

      });

    }

  } else if (

    eventType === 'cashout.failed' ||

    eventType === 'payout.failed' ||

    status === 'failed'

  ) {

    await applyWithdrawalPayoutUpdate(supabase, withdrawal.id, {

      reference: reference || '',

      payoutId: cashout.id != null ? String(cashout.id) : null,

      status: 'failed',

      finalStatus: 'failed',

      notifyMessage: `Votre retrait a échoué : ${(cashout.failure_reason as string) || 'contactez le support'}`,

    });

  } else if (

    eventType === 'cashout.requested' ||

    eventType === 'cashout.approved' ||

    eventType === 'payout.created'

  ) {

    await supabase

      .from('withdrawals')

      .update({

        geniuspay_payout_status: status || eventType.replace('cashout.', ''),

        updated_at: new Date().toISOString(),

      })

      .eq('id', withdrawal.id);

  }



  return { ok: true };

}



Deno.serve(async (req) => {

  if (req.method !== 'POST') {

    return new Response('Method not allowed', { status: 405 });

  }



  const body = await req.text();

  const signature =

    req.headers.get('X-GeniusPay-Signature') ??

    req.headers.get('X-Webhook-Signature') ??

    req.headers.get('x-webhook-signature');



  try {

    const valid = await verifyWebhookSignature(body, signature);

    if (!valid) {

      return new Response('Invalid signature', { status: 401 });

    }



    const event = JSON.parse(body);

    const eventType = (event.event ?? req.headers.get('X-Webhook-Event') ?? '') as string;



    const supabase = createClient(

      Deno.env.get('SUPABASE_URL')!,

      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    );



    if (

      eventType.startsWith('cashout.') ||

      eventType.startsWith('payout.') ||

      eventType.startsWith('batch.')

    ) {

      const result = await handleWithdrawalCashoutEvent(supabase, eventType, event);

      return new Response(JSON.stringify(result), {

        headers: { 'Content-Type': 'application/json' },

      });

    }



    const tx = event.data?.transaction ?? event.data ?? {};

    const reference = tx.reference as string | undefined;

    const metadata = tx.metadata ?? {};

    const linkDbId = metadata.payment_link_id as string | undefined;

    const linkId = metadata.link_id as string | undefined;



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

    } else if (reference) {

      const { data } = await supabase

        .from('payment_links')

        .select('id, is_paid')

        .eq('geniuspay_reference', reference)

        .maybeSingle();

      link = data;

    }



    if (!link) {

      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'link_not_found' }), {

        headers: { 'Content-Type': 'application/json' },

      });

    }



    if (eventType === 'payment.success' || tx.status === 'completed') {

      if (!link.is_paid) {

        await markLinkPaid(supabase, link.id, {

          reference: reference || tx.reference,

          geniuspayPaymentId: tx.id ?? null,

          status: 'completed',

          fees: tx.fees ?? null,

          gateway: tx.payment_method ?? tx.gateway ?? null,

        });

      }

    } else if (eventType === 'payment.failed' || eventType === 'payment.cancelled') {

      await supabase

        .from('payment_links')

        .update({

          geniuspay_status: eventType === 'payment.cancelled' ? 'cancelled' : 'failed',

          updated_at: new Date().toISOString(),

        })

        .eq('id', link.id);

    }



    return new Response(JSON.stringify({ ok: true }), {

      headers: { 'Content-Type': 'application/json' },

    });

  } catch (err) {

    console.error('GeniusPay webhook error:', err);

    return new Response(JSON.stringify({ error: 'Webhook failed' }), { status: 500 });

  }

});

