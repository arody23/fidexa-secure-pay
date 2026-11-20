import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/** Statut public minimal d’un paiement d’abonnement (UUID = secret de session). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id =
      url.searchParams.get('id') ||
      (req.method === 'POST' ? String((await req.json().catch(() => ({}))).id || '') : '');

    if (!id || id.length < 20) {
      return new Response(JSON.stringify({ error: 'Identifiant manquant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, plan, plan_name, cycle, amount_usd, status, payment_ref, checkout_url, paid_at, period_end, created_at, updated_at'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: 'Paiement introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        plan: data.plan,
        planName: data.plan_name,
        cycle: data.cycle,
        amountUsd: data.amount_usd,
        status: data.status,
        paymentRef: data.payment_ref,
        checkoutUrl: data.checkout_url,
        paidAt: data.paid_at,
        periodEnd: data.period_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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
