import { createClient } from 'jsr:@supabase/supabase-js@2';
import { dispatchNotificationEvent } from './notifyDispatch.ts';

export type PlanId = 'basique' | 'essentiel' | 'premium';
export type BillingCycle = 'monthly' | 'yearly';

const COMMISSION: Record<PlanId, number> = {
  basique: 9,
  essentiel: 6,
  premium: 4,
};

const PRICE_USD: Record<PlanId, { monthly: number; yearly: number | null }> = {
  basique: { monthly: 0, yearly: null },
  essentiel: { monthly: 29, yearly: 290 },
  premium: { monthly: 69, yearly: 690 },
};

export function normalizePlanId(raw: string | null | undefined): PlanId {
  const k = String(raw || '').toLowerCase();
  if (k === 'essentiel' || k === 'essential') return 'essentiel';
  if (k === 'premium' || k === 'standard') return 'premium';
  return 'basique';
}

export function planPriceUsd(plan: PlanId, cycle: BillingCycle): number {
  const p = PRICE_USD[plan];
  if (cycle === 'yearly' && p.yearly != null) return p.yearly;
  return p.monthly;
}

export function commissionForPlan(plan: PlanId): number {
  return COMMISSION[plan];
}

export function periodEndIso(cycle: BillingCycle, from = new Date()): string {
  const d = new Date(from);
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

type Sb = ReturnType<typeof createClient>;

export async function activatePaidSubscription(
  supabase: Sb,
  opts: {
    subscriptionId: string;
    userId: string;
    plan: PlanId;
    cycle: BillingCycle;
    paymentRef?: string | null;
    amountUsd?: number;
    phone?: string | null;
  }
) {
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = periodEndIso(opts.cycle, now);
  const rate = commissionForPlan(opts.plan);

  await supabase
    .from('subscriptions')
    .update({
      status: 'paid',
      paid_at: periodStart,
      period_start: periodStart,
      period_end: periodEnd,
      payment_ref: opts.paymentRef ?? null,
      amount_usd: opts.amountUsd ?? planPriceUsd(opts.plan, opts.cycle),
      plan: opts.plan,
      cycle: opts.cycle,
      user_id: opts.userId,
      provider_id: opts.userId,
      updated_at: periodStart,
    })
    .eq('id', opts.subscriptionId);

  await supabase
    .from('users')
    .update({
      plan: opts.plan,
      subscription_plan: opts.plan,
      subscription_type: opts.plan,
      subscription_status: 'active',
      commission_rate: rate,
      plan_billing_cycle: opts.cycle,
      plan_expires_at: periodEnd,
      plan_grace_until: null,
      updated_at: periodStart,
    })
    .eq('id', opts.userId);

  if (opts.phone) {
    await dispatchNotificationEvent('subscription.purchased', {
      recipientPhone: opts.phone,
      idempotencyKey: `subscription.purchased:${opts.subscriptionId}`,
      variables: {
        plan_name: opts.plan,
        cycle: opts.cycle,
        amount_usd: String(opts.amountUsd ?? planPriceUsd(opts.plan, opts.cycle)),
        expires_at: periodEnd,
      },
    });
  }

  return { periodEnd, rate };
}

export async function notifySubscriptionExpired(
  supabase: Sb,
  userId: string,
  phone: string | null,
  plan: string
) {
  await supabase
    .from('users')
    .update({
      plan: 'basique',
      subscription_plan: 'basique',
      subscription_type: 'basique',
      subscription_status: 'expired',
      commission_rate: 9,
      plan_billing_cycle: null,
      plan_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (phone) {
    await dispatchNotificationEvent('subscription.expired', {
      recipientPhone: phone,
      idempotencyKey: `subscription.expired:${userId}:${plan}:${Date.now()}`,
      variables: { plan_name: plan },
    });
  }
}
