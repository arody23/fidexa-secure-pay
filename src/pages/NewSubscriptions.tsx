import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Abonnements</h1>
        <p className="text-muted-foreground">
          Choisissez le plan qui convient à votre entreprise
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{MVP_SUBSCRIPTION.name}</CardTitle>
              {isBasic && <Badge>Actif</Badge>}
            </div>
            <CardDescription>{MVP_SUBSCRIPTION.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">Gratuit</span>
              <span className="text-muted-foreground">· pour toujours</span>
            </div>
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Commission par transaction validée</p>
              <p className="text-4xl font-bold text-primary">{MVP_SUBSCRIPTION.commission} %</p>
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
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20">
        <CardContent className="flex gap-4 pt-6">
          <Shield className="h-8 w-8 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent l&apos;escrow FidexaPay : fonds protégés jusqu&apos;à validation client, puis libérés sur votre solde retirable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
