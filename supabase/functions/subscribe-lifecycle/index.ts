import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';
import {
  commissionForPlan,
  normalizePlanId,
  notifySubscriptionExpired,
  periodEndIso,
  resolveCatalogPlanId,
  type PlanId,
} from '../_shared/subscriptions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await supabase
      .from('users')
      .select('id, plan, phone_number, plan_expires_at, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Profil introuvable');

    if (action === 'cancel') {
      const now = new Date().toISOString();
      const { data: latestPaid } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestPaid?.id) {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: now })
          .eq('id', latestPaid.id);
      }

      // Annulation : bascule Basique immédiatement + notif WhatsApp
      await notifySubscriptionExpired(
        supabase,
        user.id,
        profile.phone_number,
        profile.plan || 'premium'
      );

      if (profile.phone_number) {
        await dispatchNotificationEvent('subscription.cancelled', {
          recipientPhone: profile.phone_number,
          idempotencyKey: `subscription.cancelled:${user.id}:${Date.now()}`,
          variables: {
            plan_name: profile.plan || '',
            provider_name: profile.full_name || '',
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Abonnement annulé. Vous êtes repassé sur le plan Basique.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refund_request') {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, amount_usd, payment_ref, status')
        .eq('user_id', user.id)
        .in('status', ['paid', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const planId = normalizePlanId(profile.plan || 'essentiel');
      const catalog = await resolveCatalogPlanId(supabase, planId as PlanId);
      const now = new Date();
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        provider_id: user.id,
        plan_id: catalog?.id ?? null,
        plan_name: catalog?.displayName ?? planId,
        plan: planId,
        amount_usd: sub?.amount_usd ?? 0,
        amount_paid: 0,
        commission_rate: commissionForPlan(planId as PlanId),
        status: 'pending',
        source: 'direct',
        payment_ref: `refund-req:${sub?.id || 'none'}:${Date.now()}`,
        payment_method: 'mobile_money',
        start_date: now.toISOString(),
        end_date: periodEndIso('monthly', now),
        period_start: now.toISOString(),
      });

      if (profile.phone_number) {
        await dispatchNotificationEvent('subscription.refund_requested', {
          recipientPhone: profile.phone_number,
          idempotencyKey: `subscription.refund_requested:${user.id}:${Date.now()}`,
          variables: {
            plan_name: profile.plan || '',
            amount_usd: String(sub?.amount_usd ?? 0),
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            'Demande de remboursement enregistrée. FidexaPay vous contactera sur WhatsApp.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'expire_check') {
      // Appel admin / cron : expire les plans dépassés
      const now = new Date().toISOString();
      const { data: expired } = await supabase
        .from('users')
        .select('id, plan, phone_number')
        .not('plan_expires_at', 'is', null)
        .lt('plan_expires_at', now)
        .neq('plan', 'basique');

      for (const row of expired || []) {
        await notifySubscriptionExpired(supabase, row.id, row.phone_number, row.plan || '');
      }

      return new Response(
        JSON.stringify({ success: true, expired: (expired || []).length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
