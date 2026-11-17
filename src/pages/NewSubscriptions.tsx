import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
        title: 'Plan Basique activé',
        description: `Commission ${result.commission_rate ?? SITE.commissionBasic} % sur vos ventes validées.`,
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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">
        Abonnements
      </h1>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-2xl font-semibold text-[#0b2f63]">{MVP_SUBSCRIPTION.name}</h2>
            {isBasic && <Badge>Actif</Badge>}
          </div>
          <p className="mb-6 text-sm text-[#5c7188]">{MVP_SUBSCRIPTION.description}</p>
          <div className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-[#0b2f63]">Gratuit</span>
              <span className="text-[#5c7188]">· pour toujours</span>
            </div>
            <div className="rounded-xl bg-[#0b3b78]/8 p-4 text-center ring-1 ring-[#dbe6f2]">
              <p className="text-sm text-[#5c7188]">Commission par transaction validée</p>
              <p className="text-4xl font-bold text-[#0b3b78]">{MVP_SUBSCRIPTION.commission} %</p>
            </div>
            <ul className="space-y-3">
              {MVP_SUBSCRIPTION.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {!isBasic ? (
              <Button className="w-full" onClick={activateBasic} disabled={activating}>
                {activating ? 'Activation…' : 'Activer le plan Basique'}
              </Button>
            ) : (
              <Button className="w-full" variant="outline" disabled>
                Plan actuel
              </Button>
            )}
          </div>
        </section>
      </motion.div>

      <section className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2]">
        <Shield className="h-8 w-8 shrink-0 text-[#0b3b78]" />
        <p className="text-sm text-[#5c7188]">
          Escrow FidexaPay : fonds protégés jusqu&apos;à validation client.
        </p>
      </section>
    </div>
  );
}
