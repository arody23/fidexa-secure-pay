import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, getPayPalAccessToken, getPayPalApiBase } from '../_shared/paypal.ts';



Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {

    return new Response('ok', { headers: corsHeaders });

  }



  try {

    const { orderId, linkId } = await req.json();

    if (!orderId || !linkId) {

      return new Response(JSON.stringify({ error: 'orderId et linkId requis' }), {

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

      .select('id, link_id, is_paid, paypal_order_id')

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



    if (link.paypal_order_id && link.paypal_order_id !== orderId) {

      return new Response(JSON.stringify({ error: 'Order ID invalide' }), {

        status: 400,

        headers: { ...corsHeaders, 'Content-Type': 'application/json' },

      });

    }



    const token = await getPayPalAccessToken();

    const apiBase = getPayPalApiBase();



    const captureRes = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, {

      method: 'POST',

      headers: {

        Authorization: `Bearer ${token}`,

        'Content-Type': 'application/json',

      },

    });



    const captureData = await captureRes.json();



    if (!captureRes.ok) {

      const issue = captureData.details?.[0]?.issue;

      if (issue === 'ORDER_ALREADY_CAPTURED') {

        const orderRes = await fetch(`${apiBase}/v2/checkout/orders/${orderId}`, {

          headers: { Authorization: `Bearer ${token}` },

        });

        const orderData = await orderRes.json();

        if (orderData.status === 'COMPLETED') {

          const capture =

            orderData.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

          await markPaid(supabase, link.id, orderId, capture?.id ?? null);

          return new Response(

            JSON.stringify({ success: true, captureId: capture?.id, orderId, alreadyCaptured: true }),

            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }

          );

        }

      }



      console.error('PayPal capture error:', captureData);

      const detail = captureData.details?.[0]?.description || captureData.message;

      return new Response(JSON.stringify({ error: detail || 'Capture échouée' }), {

        status: 502,

        headers: { ...corsHeaders, 'Content-Type': 'application/json' },

      });

    }



    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

    const captureId = capture?.id ?? null;

    const status = captureData.status;



    if (status !== 'COMPLETED') {

      return new Response(JSON.stringify({ error: 'Paiement non complété', status }), {

        status: 400,

        headers: { ...corsHeaders, 'Content-Type': 'application/json' },

      });

    }



    await markPaid(supabase, link.id, orderId, captureId);



    return new Response(

      JSON.stringify({ success: true, captureId, orderId }),

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



async function markPaid(

  supabase: ReturnType<typeof createClient>,

  linkDbId: string,

  orderId: string,

  captureId: string | null

) {

  const now = new Date().toISOString();

  const { error: updateError } = await supabase

    .from('payment_links')

    .update({

      is_paid: true,

      status: 'paid',

      order_status: 'paid',

      paid_at: now,

      paypal_order_id: orderId,

      paypal_capture_id: captureId,

      paypal_status: 'COMPLETED',

      payment_method: 'paypal',

      escrow_released: false,

      updated_at: now,

    })

    .eq('id', linkDbId);



  if (updateError) {

    console.error('DB update error:', updateError);

    throw new Error(`Mise à jour commande échouée: ${updateError.message}`);

  }



  const { error: timelineError } = await supabase.from('order_timeline').insert({

    payment_link_id: linkDbId,

    status: 'paid',

    action: 'Paiement PayPal',

    description: `Paiement carte/PayPal confirmé (capture ${captureId ?? orderId})`,

    actor_type: 'client',

  });



  if (timelineError) {

    console.warn('order_timeline insert skipped:', timelineError.message);

  }

}


