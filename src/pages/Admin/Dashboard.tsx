import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Receipt,
  Shield,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Activity,
  Wallet,
  Globe2,
  Lock,
  Crown,
} from 'lucide-react';
import { getPlan, normalizePlanId } from '@/lib/plans';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  convertToUSD,
  formatUSD,
  formatAmount,
  commissionToUSD,
  normalizeCurrency,
} from '@/lib/currency';
import { isActivelyInEscrow } from '@/lib/escrowConfig';
import { COVERAGE_COUNTRIES } from '@/lib/kpayProviders';
import { countryFlagEmoji } from '@/lib/worldDialCodes';

interface PaymentLinkRow {
  id: string;
  amount: number;
  status: string;
  order_status?: string | null;
  is_paid: boolean;
  escrow_released: boolean | null;
  refunded?: boolean | null;
  created_at: string;
  provider_id: string | null;
  commission_amount: number | null;
}

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  kycPending: number;
  kycVerified: number;
  kycRejected: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingDisputes: number;
  totalCommissions: number;
  releasedCommissions: number;
  escrowCommissions: number;
  fidexaBalance: number;
  totalIncoming: number;
}

const revenueChartConfig = {
  revenue: { label: 'Revenus (USD)', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

const statusChartConfig = {
  paid: { label: 'Payées', color: 'hsl(142 76% 36%)' },
  pending: { label: 'En attente', color: 'hsl(45 93% 47%)' },
  cancelled: { label: 'Annulées', color: 'hsl(0 84% 60%)' },
} satisfies ChartConfig;

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    verifiedUsers: 0,
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    totalTransactions: 0,
    paidTransactions: 0,
    pendingDisputes: 0,
    totalCommissions: 0,
    releasedCommissions: 0,
    escrowCommissions: 0,
    fidexaBalance: 0,
    totalIncoming: 0,
  });
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({});
  const [recentActivities, setRecentActivities] = useState<
    { id: string; description: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribers, setSubscribers] = useState<
    {
      id: string;
      full_name: string | null;
      email: string;
      plan: string | null;
      plan_billing_cycle: string | null;
      plan_expires_at: string | null;
      subscription_status: string | null;
      amount_usd: number | null;
    }[]
  >([]);

  useEffect(() => {
    loadDashboardData();

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_links' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_settlements' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setError('');

      const [usersResult, disputesResult, linksResult, subsUsersResult] = await Promise.all([
        supabase.from('users').select('id, verified, kyc_status, role, is_admin'),
        supabase.from('disputes').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase
          .from('payment_links')
          .select(
            'id, amount, status, order_status, is_paid, escrow_released, refunded, created_at, provider_id, commission_amount'
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select(
            'id, full_name, email, plan, plan_billing_cycle, plan_expires_at, subscription_status, role, is_admin'
          )
          .not('plan', 'is', null)
          .neq('plan', 'basique')
          .order('plan_expires_at', { ascending: true }),
      ]);

      const allUsers = (usersResult.data || []).filter(
        (u: { role?: string | null; is_admin?: boolean | null }) =>
          !u.is_admin && u.role !== 'admin' && u.role !== 'support' && u.role !== 'moderator'
      );
      const allLinks = (linksResult.data || []) as (PaymentLinkRow & { refunded?: boolean | null })[];
      setLinks(allLinks);

      const providerIds = [
        ...new Set(allLinks.map((l) => l.provider_id).filter(Boolean)),
      ] as string[];

      let currencies: Record<string, string> = {};
      if (providerIds.length > 0) {
        const { data: providers } = await supabase
          .from('users')
          .select('id, currency')
          .in('id', providerIds);
        currencies = Object.fromEntries(
          (providers || []).map((p) => [p.id, normalizeCurrency(p.currency)])
        );
      }
      setCurrencyMap(currencies);

      const getCurrency = (link: PaymentLinkRow) =>
        (link.provider_id && currencies[link.provider_id]) || 'FCFA';

      let totalIncomingUSD = 0;
      let totalCommissionsUSD = 0;
      let releasedCommissionsUSD = 0;
      let escrowCommissionsUSD = 0;

      for (const link of allLinks) {
        const currency = getCurrency(link);
        if (link.is_paid) {
          totalIncomingUSD += convertToUSD(link.amount, currency);
          const commission =
            link.commission_amount != null
              ? convertToUSD(link.commission_amount, currency)
              : commissionToUSD(link.amount, currency);
          totalCommissionsUSD += commission;
          // Commission gagnée : libération prestataire OU remboursement client (part FidexaPay retenue)
          if (link.escrow_released || link.refunded) {
            releasedCommissionsUSD +=
              link.commission_amount != null
                ? convertToUSD(link.commission_amount, currency)
                : commissionToUSD(link.amount, currency);
          } else if (isActivelyInEscrow(link)) {
            // Uniquement les commandes encore vraiment en escrow (pas annulées / litige tranché)
            escrowCommissionsUSD += commission;
          }
        }
      }

      setStats({
        totalUsers: allUsers.length,
        verifiedUsers: allUsers.filter((u) => u.verified).length,
        kycPending: allUsers.filter((u) => u.kyc_status === 'pending').length,
        kycVerified: allUsers.filter((u) => u.kyc_status === 'verified').length,
        kycRejected: allUsers.filter((u) => u.kyc_status === 'rejected').length,
        totalTransactions: allLinks.length,
        paidTransactions: allLinks.filter((l) => l.is_paid).length,
        pendingDisputes: disputesResult.count || 0,
        totalCommissions: totalCommissionsUSD,
        releasedCommissions: releasedCommissionsUSD,
        escrowCommissions: escrowCommissionsUSD,
        fidexaBalance: releasedCommissionsUSD,
        totalIncoming: totalIncomingUSD,
      });

      setRecentActivities(
        allLinks.slice(0, 8).map((link) => {
          const currency = getCurrency(link);
          const { original, usd } = formatAmountWithMeta(link.amount, currency);
          return {
            id: link.id,
            description: `${link.is_paid ? 'Paiement' : 'Commande'} — ${original} (${usd})`,
            created_at: link.created_at,
          };
        })
      );

      const paidUsers = ((subsUsersResult.data || []) as {
        id: string;
        full_name: string | null;
        email: string;
        plan: string | null;
        plan_billing_cycle: string | null;
        plan_expires_at: string | null;
        subscription_status: string | null;
        role?: string | null;
        is_admin?: boolean | null;
      }[]).filter((u) => !u.is_admin && u.role !== 'admin');

      const userIds = paidUsers.map((u) => u.id);
      let amountByUser: Record<string, number> = {};
      if (userIds.length) {
        const { data: paidSubs } = await supabase
          .from('subscriptions')
          .select('user_id, amount_usd, status, created_at')
          .in('user_id', userIds)
          .in('status', ['paid', 'active'])
          .order('created_at', { ascending: false });
        for (const row of paidSubs || []) {
          const uid = String(row.user_id || '');
          if (uid && amountByUser[uid] == null && row.amount_usd != null) {
            amountByUser[uid] = Number(row.amount_usd);
          }
        }
      }

      setSubscribers(
        paidUsers.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          plan: u.plan,
          plan_billing_cycle: u.plan_billing_cycle,
          plan_expires_at: u.plan_expires_at,
          subscription_status: u.subscription_status,
          amount_usd:
            amountByUser[u.id] ??
            (normalizePlanId(u.plan) === 'premium'
              ? u.plan_billing_cycle === 'yearly'
                ? 690
                : 69
              : u.plan_billing_cycle === 'yearly'
                ? 290
                : 29),
        }))
      );
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  function formatAmountWithMeta(amount: number, currency: string) {
    const original = formatAmount(amount, currency);
    const usd = formatUSD(convertToUSD(amount, currency));
    return { original, usd };
  }

  const revenueByDay = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    for (const link of links) {
      if (!link.is_paid) continue;
      const day = link.created_at.slice(0, 10);
      if (day in days) {
        const currency =
          (link.provider_id && currencyMap[link.provider_id]) || 'FCFA';
        days[day] += convertToUSD(link.amount, currency);
      }
    }
    return Object.entries(days).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: Math.round(revenue * 100) / 100,
    }));
  }, [links, currencyMap]);

  const transactionStatusData = useMemo(() => {
    const paid = links.filter((l) => l.is_paid).length;
    const cancelled = links.filter((l) => l.status === 'cancelled').length;
    const pending = links.length - paid - cancelled;
    return [
      { name: 'paid', value: paid, fill: 'var(--color-paid)' },
      { name: 'pending', value: pending, fill: 'var(--color-pending)' },
      { name: 'cancelled', value: cancelled, fill: 'var(--color-cancelled)' },
    ].filter((d) => d.value > 0);
  }, [links]);

  const escrowOverview = useMemo(() => {
    const active = links.filter((l) => isActivelyInEscrow(l));
    const disputed = links.filter(
      (l) =>
        l.is_paid &&
        !l.escrow_released &&
        !l.refunded &&
        String(l.order_status || '').toLowerCase() === 'disputed'
    );
    const released = links.filter((l) => l.is_paid && l.escrow_released);
    const refunded = links.filter((l) => l.is_paid && l.refunded);
    const getCurrency = (link: PaymentLinkRow) =>
      (link.provider_id && currencyMap[link.provider_id]) || 'FCFA';
    const activeUSD = active.reduce((s, l) => s + convertToUSD(l.amount, getCurrency(l)), 0);
    const disputedUSD = disputed.reduce((s, l) => s + convertToUSD(l.amount, getCurrency(l)), 0);
    return {
      activeCount: active.length,
      activeUSD,
      disputedCount: disputed.length,
      disputedUSD,
      releasedCount: released.length,
      refundedCount: refunded.length,
    };
  }, [links, currencyMap]);

  const monthlyVolume = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    for (const link of links) {
      const key = link.created_at.slice(0, 7);
      if (key in months) {
        months[key]++;
      }
    }
    return Object.entries(months).map(([key, count]) => ({
      month: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
      transactions: count,
    }));
  }, [links]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Solde FidexaPay',
      value: formatUSD(stats.fidexaBalance),
      icon: Wallet,
      description: 'Commissions libérées (USD)',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Revenus totaux',
      value: formatUSD(stats.totalIncoming),
      icon: TrendingUp,
      description: 'Volume payé converti en USD',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Commissions gagnées',
      value: formatUSD(stats.releasedCommissions),
      icon: DollarSign,
      description: 'Fonds libérés',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Commissions en escrow',
      value: formatUSD(stats.escrowCommissions),
      icon: Activity,
      description: 'Uniquement commandes encore actives',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Utilisateurs',
      value: stats.totalUsers,
      icon: Users,
      description: `${stats.verifiedUsers} vérifiés`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Transactions',
      value: stats.totalTransactions,
      icon: Receipt,
      description: `${stats.paidTransactions} payées`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'KYC en attente',
      value: stats.kycPending,
      icon: Shield,
      description: 'Dossiers à traiter',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Litiges ouverts',
      value: stats.pendingDisputes,
      icon: AlertTriangle,
      description: 'Nécessitent attention',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              Abonnements prestataires
            </CardTitle>
            <CardDescription>
              Plans payants actifs — type, montant et date d’expiration
            </CardDescription>
          </div>
          <Badge variant="secondary">{subscribers.length}</Badge>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun abonnement payant pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Prestataire</th>
                    <th className="pb-2 font-medium">Plan</th>
                    <th className="pb-2 font-medium">Cycle</th>
                    <th className="pb-2 font-medium">Montant</th>
                    <th className="pb-2 font-medium">Expire</th>
                    <th className="pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => {
                    const plan = getPlan(s.plan);
                    const expired =
                      s.plan_expires_at && new Date(s.plan_expires_at).getTime() < Date.now();
                    return (
                      <tr key={s.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-foreground">
                            {s.full_name || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </td>
                        <td className="py-3 pr-3">{plan.name}</td>
                        <td className="py-3 pr-3">
                          {s.plan_billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}
                        </td>
                        <td className="py-3 pr-3 tabular-nums">
                          {s.amount_usd != null ? `$${s.amount_usd}` : '—'}
                        </td>
                        <td className="py-3 pr-3">
                          {s.plan_expires_at
                            ? new Date(s.plan_expires_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="py-3">
                          <Badge variant={expired ? 'destructive' : 'secondary'}>
                            {expired ? 'expiré' : s.subscription_status || 'actif'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus — 30 derniers jours</CardTitle>
            <CardDescription>Volume payé converti en USD</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
              <AreaChart data={revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions par mois</CardTitle>
            <CardDescription>Volume d&apos;activité sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ transactions: { label: 'Transactions', color: 'hsl(var(--primary))' } }} className="h-[280px] w-full">
              <BarChart data={monthlyVolume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="transactions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut des transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionStatusData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Aucune transaction</p>
            ) : (
              <ChartContainer config={statusChartConfig} className="mx-auto h-[260px] w-full max-w-sm">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={transactionStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {transactionStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#0b3b78]" /> Escrow &amp; couverture
            </CardTitle>
            <CardDescription>Fonds actifs et pays ouverts à la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#eef5ff] p-3">
                <p className="text-[11px] font-medium text-[#5c7188]">En escrow</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#0b2f63]">
                  {formatUSD(escrowOverview.activeUSD)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a9bb0]">
                  {escrowOverview.activeCount} commande{escrowOverview.activeCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-xl bg-[#fff6e8] p-3">
                <p className="text-[11px] font-medium text-[#5c7188]">En litige</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#0b2f63]">
                  {formatUSD(escrowOverview.disputedUSD)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a9bb0]">
                  {escrowOverview.disputedCount} dossier{escrowOverview.disputedCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-xl bg-[#edf9f2] p-3">
                <p className="text-[11px] font-medium text-[#5c7188]">Libérées</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#0b2f63]">
                  {escrowOverview.releasedCount}
                </p>
              </div>
              <div className="rounded-xl bg-[#fef2f2] p-3">
                <p className="text-[11px] font-medium text-[#5c7188]">Remboursées</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[#0b2f63]">
                  {escrowOverview.refundedCount}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#0b3b78]" />
                <p className="text-sm font-semibold text-[#0b2f63]">
                  Pays actifs ({COVERAGE_COUNTRIES.length})
                </p>
              </div>
              <ul className="max-h-[160px] space-y-2 overflow-y-auto pr-1">
                {COVERAGE_COUNTRIES.map((country) => (
                  <li
                    key={country.code}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[#e4edf6] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#0b2f63]">
                        <span className="mr-1.5" aria-hidden>
                          {countryFlagEmoji(country.code)}
                        </span>
                        {country.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8a9bb0]">
                        {country.providers.map((p) => p.label).join(' · ')}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {country.phonePrefix}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>Montant original + équivalent USD</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente</p>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">💳</Badge>
                    <p className="text-sm font-medium">{activity.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
