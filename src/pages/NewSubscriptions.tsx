import { useEffect, useState } from 'react';
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
  type BillingCycle,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';

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
  const [momoPhone, setMomoPhone] = useState('');
  const [showPaySheet, setShowPaySheet] = useState<PlanDefinition | null>(null);

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
        setCurrent(data as UserPlanRow);
        setMomoPhone((data.phone_number || '').replace(/\D/g, ''));
        if (data.plan_billing_cycle === 'yearly' || data.plan_billing_cycle === 'monthly') {
          setBillingCycle(data.plan_billing_cycle);
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
    const phone = momoPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      toast({
        title: 'Numéro Mobile Money requis',
        description: 'Indiquez le numéro qui recevra la demande USSD.',
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
        description: data.message || 'Vous repassez sur Basique à la fin de la période en cours.',
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

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-4 sm:space-y-6 sm:pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
          Abonnement
        </h1>
        <p className="mt-1 text-xs text-[#5c7188] sm:text-sm">
          Plan actuel : <span className="font-semibold text-[#0b2f63]">{currentPlan.name}</span>
          {' · '}
          {current?.commission_rate ?? currentPlan.commission}&nbsp;% de commission
          {expiresLabel ? ` · jusqu’au ${expiresLabel}` : ''}
        </p>
      </div>

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
              <div className="h-12 w-full rounded-xl border border-[#d7e3f0] bg-[#f7fafd] text-center text-sm font-medium leading-[3rem] text-[#5c7188]">
                Plan actuel
              </div>
            );
          }
          if (isCurrent) {
            return (
              <div className="space-y-2">
                <div className="h-12 w-full rounded-xl border border-[#d7e3f0] bg-[#f7fafd] text-center text-sm font-medium leading-[3rem] text-[#5c7188]">
                  Plan actuel · ${amount}
                  {cycle === 'yearly' ? '/an' : '/mois'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={canceling}
                    onClick={cancelSubscription}
                  >
                    {canceling ? '…' : 'Annuler'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
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
              className="h-12 w-full rounded-xl bg-[#0b3b78] text-base font-semibold text-white hover:bg-[#0a3266]"
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
            ) : null}

            {showPaySheet.id !== 'basique' && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="momo">Numéro Mobile Money</Label>
                <Input
                  id="momo"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder="Ex. 2438…"
                  inputMode="tel"
                />
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
