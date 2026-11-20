import { useEffect, useState } from 'react';
import { Crown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getPlan, normalizePlanId } from '@/lib/plans';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';

type SubRow = {
  id: string;
  user_id: string | null;
  plan: string | null;
  cycle: string | null;
  amount_usd: number | null;
  status: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  period_end: string | null;
  source: string | null;
  created_at: string;
};

type UserPlan = {
  id: string;
  full_name: string | null;
  email: string;
  plan: string | null;
  commission_rate: number | null;
  plan_expires_at: string | null;
  subscription_status: string | null;
};

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [users, setUsers] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(
            'id, user_id, plan, cycle, amount_usd, status, payment_ref, paid_at, period_end, source, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('users')
          .select('id, full_name, email, plan, commission_rate, plan_expires_at, subscription_status')
          .neq('plan', 'basique')
          .order('plan_expires_at', { ascending: true })
          .limit(50),
      ]);
      if (s.data) setSubs(s.data as SubRow[]);
      if (u.data) setUsers(u.data as UserPlan[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runExpireCheck = async () => {
    try {
      setExpiring(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session admin requise');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ action: 'expire_check' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec');
      toast({
        title: 'Vérification OK',
        description: `${data.expired ?? 0} abonnement(s) expiré(s)`,
      });
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Échec',
        variant: 'destructive',
      });
    } finally {
      setExpiring(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#0b2f63]">
            <Crown className="h-6 w-6 text-[#0b3b78]" />
            Abonnements
          </h1>
          <p className="mt-1 text-sm text-[#5c7188]">
            Historique des paiements de plans et prestataires payants actifs.
          </p>
        </div>
        <Button variant="outline" onClick={runExpireCheck} disabled={expiring}>
          <RefreshCw className={`mr-2 h-4 w-4 ${expiring ? 'animate-spin' : ''}`} />
          Expirer les plans dus
        </Button>
      </div>

      <section className="rounded-2xl border border-[#e2eaf3] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8a9bb0]">
          Prestataires payants
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-[#8a9bb0]">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-[#8a9bb0]">Aucun plan Essentiel / Premium actif.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#eef3f9]">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-[#0b2f63]">{u.full_name || u.email}</p>
                  <p className="text-xs text-[#8a9bb0]">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#0b3b78]">
                    {getPlan(normalizePlanId(u.plan)).name} · {u.commission_rate ?? '—'}%
                  </p>
                  <p className="text-xs text-[#8a9bb0]">
                    {u.plan_expires_at
                      ? `Expire ${new Date(u.plan_expires_at).toLocaleDateString('fr-FR')}`
                      : u.subscription_status || '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e2eaf3] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8a9bb0]">
          Historique (100 derniers)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-[#8a9bb0]">
              <tr>
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Plan</th>
                <th className="pb-2 pr-3">Montant</th>
                <th className="pb-2 pr-3">Statut</th>
                <th className="pb-2">Réf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3f9]">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-3 text-[#5c7188]">
                    {new Date(s.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-[#0b2f63]">
                    {getPlan(normalizePlanId(s.plan)).name}
                    {s.cycle ? ` · ${s.cycle}` : ''}
                  </td>
                  <td className="py-2.5 pr-3">${s.amount_usd ?? 0}</td>
                  <td className="py-2.5 pr-3">{s.status}</td>
                  <td className="py-2.5 font-mono text-xs text-[#8a9bb0]">
                    {s.payment_ref || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
