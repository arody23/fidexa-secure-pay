import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MVP_SUBSCRIPTION, SITE } from '@/config/site';

interface UserSubscription {
  subscription_type: string;
  subscription_status: string;
  commission_rate: number;
}

export default function Subscriptions() {
  const { toast } = useToast();
  const [current, setCurrent] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadData();
    ensureBasicPlan();
  }, []);

  const ensureBasicPlan = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('subscription_type')
        .eq('id', user.id)
        .maybeSingle();
      if (data && !data.subscription_type) {
        await supabase.rpc('subscribe_to_plan', {
          plan_name_param: 'basic',
          payment_method_param: 'free',
        });
        loadData();
      }
    } catch {
      /* ignore */
    }
  };

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('subscription_type, subscription_status, commission_rate')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setCurrent(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const activateBasic = async () => {
    try {
      setActivating(true);
      const { data, error } = await supabase.rpc('subscribe_to_plan', {
        plan_name_param: 'basic',
        payment_method_param: 'free',
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) throw new Error(result.error);
      toast({
        title: 'Plan activé',
        description: `Commission ${result.commission_rate ?? SITE.commissionBasic} %`,
      });
      loadData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Activation impossible',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const isBasic = current?.subscription_type === 'basic' || !current?.subscription_type;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63]">Abonnement</h1>
        <Button variant="ghost" size="sm" asChild className="text-[#0b3b78]">
          <Link to="/dashboard/profile">Retour</Link>
        </Button>
      </div>

      {/* Même design que la page d’accueil (pricing) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#071a35] p-8 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] sm:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(43,182,115,0.22), transparent 55%), linear-gradient(160deg, #071a35 0%, #0b3b78 48%, #082848 100%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6ce0a0]">
                Plan {MVP_SUBSCRIPTION.name}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Pour prestataires</h2>
            </div>
            {isBasic ? (
              <span className="rounded-full bg-[#2bb673]/20 px-3 py-1 text-xs font-semibold text-[#6ce0a0]">
                Actif
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                Recommandé
              </span>
            )}
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight sm:text-6xl">$0</span>
            <span className="mb-2 text-sm text-white/55">USD / mois</span>
          </div>
          <p className="mt-2 text-sm text-white/65">
            Puis {MVP_SUBSCRIPTION.commission}&nbsp;% de commission sur chaque transaction validée.
          </p>

          <ul className="mt-8 space-y-3.5">
            {MVP_SUBSCRIPTION.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2bb673]">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {!isBasic ? (
            <Button
              className="mt-9 h-12 w-full rounded-xl bg-[#2bb673] text-base font-semibold text-white hover:bg-[#24a367]"
              size="lg"
              onClick={activateBasic}
              disabled={activating}
            >
              {activating ? 'Activation…' : 'Activer le plan'}
            </Button>
          ) : (
            <div className="mt-9 h-12 w-full rounded-xl border border-white/20 bg-white/5 text-center text-sm font-medium leading-[3rem] text-white/80">
              Plan actuel
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
