import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlanCarousel } from '@/components/plans/PlanCarousel';
import {
  DEFAULT_PLAN_ID,
  getCommissionRate,
  getPlan,
  normalizePlanId,
  planPriceUsd,
  yearlySavingsUsd,
  type BillingCycle,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';
import { getKPayCountry } from '@/lib/kpayProviders';
import { composeE164, countryFlagEmoji, toNationalPhoneDigits } from '@/lib/worldDialCodes';

interface UserPlanRow {
  plan: string | null;
  subscription_type: string | null;
  subscription_status: string | null;
  commission_rate: number | null;
  plan_billing_cycle: string | null;
  plan_expires_at: string | null;
  phone_number: string | null;
  country: string | null;
}

/** Ouvre le checkout hors coque dashboard / PWA (nouvel onglet navigateur). */
function openOutsideApp(url: string) {
  const absolute = new URL(url, window.location.origin).toString();
  const win = window.open(absolute, '_blank', 'noopener,noreferrer');
  if (!win) {
    window.location.assign(absolute);
  }
}

export default function NewSubscriptions() {
  const { toast } = useToast();
  const [current, setCurrent] = useState<UserPlanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paying, setPaying] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [momoNational, setMomoNational] = useState('');
  const [showPaySheet, setShowPaySheet] = useState<PlanDefinition | null>(null);

  const providerCountry = useMemo(
    () => getKPayCountry(current?.country || 'CD'),
    [current?.country]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select(
          'plan, subscription_type, subscription_status, commission_rate, plan_billing_cycle, plan_expires_at, phone_number, country'
        )
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        const row = data as UserPlanRow;
        setCurrent(row);
        const prefix = getKPayCountry(row.country || 'CD').phonePrefix;
        setMomoNational(toNationalPhoneDigits(row.phone_number || '', prefix));
        if (row.plan_billing_cycle === 'yearly' || row.plan_billing_cycle === 'monthly') {
          setBillingCycle(row.plan_billing_cycle);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const currentPlanId = normalizePlanId(current?.plan || current?.subscription_type);

  const activateBasique = async () => {
    try {
      setPaying(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const { error } = await supabase
        .from('users')
        .update({
          plan: DEFAULT_PLAN_ID,
          subscription_plan: DEFAULT_PLAN_ID,
          subscription_type: DEFAULT_PLAN_ID,
          subscription_status: 'active',
          commission_rate: getCommissionRate(DEFAULT_PLAN_ID),
          plan_billing_cycle: null,
          plan_expires_at: null,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast({
        title: 'Plan Basique actif',
        description: `Commission ${getCommissionRate(DEFAULT_PLAN_ID)} %`,
      });
      await loadData();
      setShowPaySheet(null);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Activation impossible',
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  };

  const startPaidCheckout = async (plan: PlanDefinition, cycle: BillingCycle) => {
    if (plan.priceMonthlyUsd <= 0) {
      await activateBasique();
      return;
    }
    const phone = composeE164(providerCountry.phonePrefix, momoNational);
    if (phone.replace(/\D/g, '').length < 9) {
      toast({
        title: 'Numéro Mobile Money requis',
        description: 'Indiquez le numéro local (sans retaper l’indicatif).',
        variant: 'destructive',
      });
      return;
    }
    try {
      setPaying(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({
          planId: plan.id,
          cycle,
          phoneNumber: phone,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Paiement impossible');

      setShowPaySheet(null);
      const statusUrl =
        data.statusPageUrl || `/abonnement/paiement/${data.subscriptionId}`;
      openOutsideApp(statusUrl);
      toast({
        title: 'Page de paiement ouverte',
        description: 'Suivez le statut (en attente, reçu ou échoué) dans le nouvel onglet.',
      });
      await loadData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Paiement impossible',
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setCanceling(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Annulation impossible');
      toast({
        title: 'Abonnement annulé',
        description: data.message || 'Vous êtes repassé sur le plan Basique.',
      });
      await loadData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Annulation impossible',
        variant: 'destructive',
      });
    } finally {
      setCanceling(false);
    }
  };

  const requestRefund = async () => {
    try {
      setRefunding(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ action: 'refund_request' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demande impossible');
      toast({
        title: 'Demande envoyée',
        description: data.message || 'Notre équipe traitera votre remboursement via WhatsApp.',
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Demande impossible',
        variant: 'destructive',
      });
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      </div>
    );
  }

  const currentPlan = getPlan(currentPlanId);
  const expiresLabel = current?.plan_expires_at
    ? new Date(current.plan_expires_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const savingsHint = yearlySavingsUsd(
    currentPlanId === 'basique' ? 'essentiel' : currentPlanId
  );

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-4 sm:space-y-6 sm:pb-10">
      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Abonnement
        </p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Votre plan FidexaPay
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Actuel : <span className="font-medium text-slate-800">{currentPlan.name}</span>
          {' · '}
          {current?.commission_rate ?? currentPlan.commission}&nbsp;% de commission
          {expiresLabel ? ` · jusqu’au ${expiresLabel}` : ''}
        </p>
        {savingsHint ? (
          <p className="mt-3 text-xs text-slate-500">
            Passez en annuel : 2 mois offerts (−${savingsHint.savedUsd}).
          </p>
        ) : null}
      </section>

      <PlanCarousel
        variant="light"
        compact
        currentPlanId={currentPlanId}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        initialPlanId={(currentPlanId === 'basique' ? 'essentiel' : currentPlanId) as PlanId}
        renderAction={(plan, cycle) => {
          const isCurrent = plan.id === currentPlanId;
          const amount = planPriceUsd(plan.id, cycle);
          if (isCurrent && plan.id === 'basique') {
            return (
              <div className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 text-center text-sm font-medium leading-[3rem] text-slate-500">
                Plan actuel
              </div>
            );
          }
          if (isCurrent) {
            return (
              <div className="space-y-2">
                <div
                  className={`h-12 w-full rounded-xl text-center text-sm font-medium leading-[3rem] ${
                    plan.id === 'basique'
                      ? 'border border-slate-200 bg-slate-50 text-slate-500'
                      : 'border border-white/15 bg-white/10 text-white/85'
                  }`}
                >
                  Plan actuel · ${amount}
                  {cycle === 'yearly' ? '/an' : '/mois'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 border-white/25 bg-transparent text-white hover:bg-white/10"
                    disabled={canceling}
                    onClick={cancelSubscription}
                  >
                    {canceling ? '…' : 'Annuler'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 border-white/25 bg-transparent text-white hover:bg-white/10"
                    disabled={refunding}
                    onClick={requestRefund}
                  >
                    {refunding ? '…' : 'Remboursement'}
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <Button
              className={`h-12 w-full rounded-xl text-base font-semibold ${
                plan.id === 'premium'
                  ? 'bg-white text-[#145c3a] hover:bg-white/90'
                  : plan.id === 'essentiel'
                    ? 'bg-white text-[#0b2f63] hover:bg-white/90'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              size="lg"
              onClick={() => setShowPaySheet(plan)}
            >
              {plan.id === 'basique'
                ? 'Revenir à Basique'
                : `Passer à ${plan.name} · $${amount}`}
            </Button>
          );
        }}
      />

      {showPaySheet && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          style={{ paddingBottom: 'max(1rem, calc(5.5rem + env(safe-area-inset-bottom)))' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {showPaySheet.id === 'basique'
                ? 'Activer Basique'
                : `Payer ${showPaySheet.name}`}
            </h2>
            {showPaySheet.id === 'basique' ? (
              <p className="mt-1 text-sm text-slate-500">
                Gratuit — commission 9 %. Aucun prélèvement.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                ${planPriceUsd(showPaySheet.id, billingCycle)}
                {billingCycle === 'yearly' ? ' / an' : ' / mois'}
                {billingCycle === 'yearly' && yearlySavingsUsd(showPaySheet.id)
                  ? ` · ${yearlySavingsUsd(showPaySheet.id)!.monthsFree} mois offerts`
                  : ''}
              </p>
            )}

            {showPaySheet.id !== 'basique' && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="momo">Numéro Mobile Money</Label>
                <div className="flex min-w-0 gap-2">
                  <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-input bg-slate-50 px-3 text-sm font-medium tabular-nums text-slate-700">
                    <span aria-hidden>{countryFlagEmoji(providerCountry.code)}</span>
                    {providerCountry.phonePrefix}
                  </span>
                  <Input
                    id="momo"
                    value={momoNational}
                    onChange={(e) =>
                      setMomoNational(
                        toNationalPhoneDigits(e.target.value, providerCountry.phonePrefix)
                      )
                    }
                    placeholder="812 345 678"
                    inputMode="tel"
                    className="h-11 min-w-0 flex-1"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaySheet(null)}
                disabled={paying}
              >
                Fermer
              </Button>
              <Button
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                disabled={paying}
                onClick={() => startPaidCheckout(showPaySheet, billingCycle)}
              >
                {paying
                  ? '…'
                  : showPaySheet.id === 'basique'
                    ? 'Confirmer'
                    : 'Payer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
