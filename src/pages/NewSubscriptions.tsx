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
    const params = new URLSearchParams(window.location.search);
    if (params.get('sub') === 'success') {
      toast({
        title: 'Paiement reçu',
        description: 'Votre abonnement sera activé dès confirmation Mobile Money (quelques secondes).',
      });
      window.history.replaceState({}, '', '/dashboard/subscriptions');
      setTimeout(() => loadData(), 2500);
    }
    if (params.get('sub') === 'cancel') {
      toast({
        title: 'Paiement annulé',
        description: 'Aucun débit. Vous pouvez réessayer quand vous voulez.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/dashboard/subscriptions');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      toast({
        title: 'Validez sur votre téléphone',
        description: 'Une demande Mobile Money (USSD) a été envoyée pour votre abonnement.',
      });
      setShowPaySheet(null);
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
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
    <div className="mx-auto max-w-lg space-y-4 pb-4 sm:space-y-6 sm:pb-10">
      <section className="overflow-hidden rounded-3xl border border-[#d7e3f0] bg-gradient-to-br from-[#0b2f63] via-[#0b3b78] to-[#082848] p-5 text-white shadow-[0_20px_50px_-28px_rgba(11,47,99,.55)] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6ce0a0]">
          Espace abonnement
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          Choisissez le rythme de votre activité
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Plan actuel : <span className="font-semibold text-white">{currentPlan.name}</span>
          {' · '}
          {current?.commission_rate ?? currentPlan.commission}&nbsp;% de commission
          {expiresLabel ? ` · jusqu’au ${expiresLabel}` : ''}
        </p>
        {savingsHint ? (
          <p className="mt-3 inline-flex rounded-full bg-[#2bb673]/20 px-3 py-1 text-xs font-semibold text-[#6ce0a0]">
            Annuel = 2 mois offerts (−${savingsHint.savedUsd})
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
              <div className="h-12 w-full rounded-xl border border-[#cfe9db] bg-[#f7fbf8] text-center text-sm font-medium leading-[3rem] text-[#178c52]">
                Plan actuel
              </div>
            );
          }
          if (isCurrent) {
            return (
              <div className="space-y-2">
                <div
                  className={`h-12 w-full rounded-xl text-center text-sm font-medium leading-[3rem] ${
                    plan.id === 'premium'
                      ? 'border border-white/15 bg-white/10 text-white/80'
                      : 'border border-[#d7e3f0] bg-[#f7fafd] text-[#5c7188]'
                  }`}
                >
                  Plan actuel · ${amount}
                  {cycle === 'yearly' ? '/an' : '/mois'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className={`h-11 ${plan.id === 'premium' ? 'border-white/20 bg-transparent text-white hover:bg-white/10' : ''}`}
                    disabled={canceling}
                    onClick={cancelSubscription}
                  >
                    {canceling ? '…' : 'Annuler'}
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-11 ${plan.id === 'premium' ? 'border-white/20 bg-transparent text-white hover:bg-white/10' : ''}`}
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
                  ? 'bg-[#c9a227] text-[#1a1520] hover:bg-[#d4b03a]'
                  : plan.id === 'essentiel'
                    ? 'bg-[#0b3b78] text-white hover:bg-[#0a3266]'
                    : 'bg-[#2bb673] text-white hover:bg-[#24a367]'
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          style={{ paddingBottom: 'max(1rem, calc(5.5rem + env(safe-area-inset-bottom)))' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-semibold text-[#0b2f63]">
              {showPaySheet.id === 'basique'
                ? 'Activer Basique'
                : `Payer ${showPaySheet.name}`}
            </h2>
            {showPaySheet.id === 'basique' ? (
              <p className="mt-1 text-sm text-[#5c7188]">
                Gratuit — commission 9 %. Aucun prélèvement.
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#5c7188]">
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
                  <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-input bg-[#f6f9fd] px-3 text-sm font-medium tabular-nums text-[#0b3b78]">
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
                <p className="text-[11px] text-[#8a9bb0]">
                  Indicatif {providerCountry.name} prérempli — saisissez uniquement le numéro local.
                </p>
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
                className="flex-1 bg-[#2bb673] hover:bg-[#24a367]"
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
