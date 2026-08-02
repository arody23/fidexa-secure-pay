import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  corsHeaders,
  fetchKPayPayment,
  markLinkPaid,
} from '../_shared/kpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId, paymentId, reference } = await req.json();
    if (!linkId) {
      return new Response(JSON.stringify({ error: 'linkId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select('id, link_id, is_paid, kpay_reference, kpay_payment_id')
      .eq('link_id', linkId)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: 'Lien introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.is_paid) {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const id = paymentId || link.kpay_payment_id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Identifiant KPay manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tx = await fetchKPayPayment(id);
    const status = String(tx.status || '').toUpperCase();
    const ref = (tx.reference as string) || reference || link.kpay_reference || id;

    if (status === 'COMPLETED') {
      await markLinkPaid(supabase, link.id, {
        reference: ref,
        kpayPaymentId: tx.id ?? id,
        status: 'COMPLETED',
        fees: tx.feeAmount ?? null,
        gateway: tx.provider ?? null,
      });
      return new Response(JSON.stringify({ success: true, status: 'COMPLETED', reference: ref }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      await supabase
        .from('payment_links')
        .update({
          kpay_status: status,
          kpay_checkout_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', link.id);
    }

    return new Response(
      JSON.stringify({
        success: false,
        status,
        reference: ref,
        pending: status === 'PENDING' || status === 'PROCESSING',
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
