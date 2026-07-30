import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  corsHeaders,
  fetchGeniusPayPayment,
  markLinkPaid,
} from '../_shared/geniuspay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { linkId, reference } = await req.json();
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
      .select('id, link_id, is_paid, geniuspay_reference')
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

    const ref = reference || link.geniuspay_reference;
    if (!ref) {
      return new Response(JSON.stringify({ error: 'Référence GeniusPay manquante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gp = await fetchGeniusPayPayment(ref);
    const tx = gp.data ?? gp;
    const status = tx.status as string;

    if (status === 'completed') {
      await markLinkPaid(supabase, link.id, {
        reference: ref,
        geniuspayPaymentId: tx.id ?? null,
        status: 'completed',
        fees: tx.fees ?? null,
        gateway: tx.payment_method ?? tx.gateway ?? null,
      });
      return new Response(JSON.stringify({ success: true, status: 'completed', reference: ref }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: false, status, reference: ref, pending: status === 'pending' || status === 'processing' }),
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
