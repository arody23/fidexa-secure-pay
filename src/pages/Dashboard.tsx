import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  CircleDollarSign,
  Link2,
  ChevronDown,
  ChevronUp,
  Plus,
  Shield,
  TrendingUp,
  PlayCircle,
  BadgeCheck,
  Sparkles,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useProvider } from "@/contexts/ProviderContext";
import { useProviderPaymentLinks } from "@/hooks/useProviderPaymentLinks";
import { formatAmount, convertAmount } from "@/lib/currency";

interface PaymentLink {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency?: string;
  status: OrderStatus;
  created_at: string;
  is_paid: boolean;
  order_status?: string;
  escrow_released?: boolean;
  net_amount?: number;
}

interface Stats {
  pending: number;
  delivered: number;
  cancelled: number;
  dispute: number;
  monthlyVolume: number;
  escrowHeld: number;
  paidCount: number;
  unpaidCount: number;
  successRate: number;
  avgTicket: number;
  totalLinks: number;
}

function RecentLinksSection({
  paymentLinks,
  currency,
}: {
  paymentLinks: PaymentLink[];
  currency: string;
}) {
  const [showArchive, setShowArchive] = useState(false);
  const recent = paymentLinks.slice(0, 4);
  const archived = paymentLinks.slice(4);
  const visible = showArchive ? paymentLinks : recent;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
      <div className="flex items-center justify-between border-b border-[#eef3f9] px-4 py-2.5">
        <h2 className="text-sm font-semibold leading-none text-[#0b2f63]">Liens récents</h2>
        <Link to="/dashboard/orders" className="text-xs font-medium text-[#0b3b78] hover:underline">
          Tous
        </Link>
      </div>
      {paymentLinks.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[#5c7188]">Aucun lien</p>
      ) : (
        <>
          <div className="divide-y divide-[#eef3f9]">
            {visible.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0b3b78]/8 text-[#0b3b78]">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 leading-none">
                    <p className="truncate text-sm font-medium text-[#0b2f63]">{link.client_name}</p>
                    <p className="mt-1 truncate text-[11px] leading-none text-[#8a9bb0]">
                      {new Date(link.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-semibold tabular-nums text-[#0b2f63]">
                    {formatAmount(
                      convertAmount(link.amount, link.currency || currency, currency),
                      currency
                    )}
                  </p>
                  <StatusBadge
                    status={
                      (link.is_paid
                        ? link.status === "pending"
                          ? "paid"
                          : link.status
                        : link.status) as OrderStatus
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          {archived.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 border-t border-[#eef3f9] py-2.5 text-xs font-medium text-[#0b3b78]"
              onClick={() => setShowArchive((v) => !v)}
            >
              {showArchive ? (
                <>
                  Réduire <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Archives ({archived.length}) <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}

const Dashboard = () => {
  const { currency, profile } = useProvider();
  const { data: rawLinks, loading } = useProviderPaymentLinks();
  const [disputedLinkIds, setDisputedLinkIds] = useState<Set<string>>(new Set());

  const paymentLinks = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || "Client",
        client_email: (link.client_email as string) || "",
        amount: link.amount as number,
        currency: (link.currency as string) || undefined,
        status: (link.status || "pending") as OrderStatus,
        created_at: link.created_at as string,
        is_paid: Boolean(link.is_paid),
        order_status: link.order_status as string | undefined,
        escrow_released: link.escrow_released as boolean | undefined,
        net_amount: link.net_amount as number | undefined,
      })) as PaymentLink[],
    [rawLinks]
  );

  useEffect(() => {
    const loadDisputes = async () => {
      const { data } = await supabase
        .from("disputes")
        .select("payment_link_id, status")
        .eq("status", "open");

      setDisputedLinkIds(
        new Set((data ?? []).map((d) => d.payment_link_id as string))
      );
    };

    loadDisputes();

    const channel = supabase
      .channel("dashboard-disputes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => loadDisputes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo<Stats>(() => {
    const paidLinks = paymentLinks.filter((l) => l.is_paid);
    const unpaidLinks = paymentLinks.filter((l) => !l.is_paid && l.status !== "cancelled");
    const releasedLinks = paidLinks.filter((l) => l.escrow_released === true);
    const heldLinks = paidLinks.filter((l) => !l.escrow_released);
    const monthlyVolume = releasedLinks.reduce(
      (sum, l) =>
        sum +
        convertAmount(l.net_amount || l.amount, l.currency || currency, currency),
      0
    );
    const escrowHeld = heldLinks.reduce(
      (sum, l) => sum + convertAmount(l.amount, l.currency || currency, currency),
      0
    );
    const closed = paidLinks.filter(
      (l) =>
        l.order_status === "validated" ||
        l.order_status === "completed" ||
        l.order_status === "cancelled" ||
        l.order_status === "disputed"
    ).length;
    const success = paidLinks.filter(
      (l) => l.order_status === "validated" || l.order_status === "completed"
    ).length;

    return {
      pending: paidLinks.filter(
        (l) =>
          !l.order_status ||
          l.order_status === "paid" ||
          l.order_status === "started"
      ).length,
      delivered: paidLinks.filter(
        (l) =>
          l.order_status === "validated" || l.order_status === "completed"
      ).length,
      cancelled: paidLinks.filter((l) => l.order_status === "cancelled").length,
      dispute: Math.max(
        paidLinks.filter((l) => l.order_status === "disputed").length,
        paidLinks.filter((l) => disputedLinkIds.has(l.id)).length
      ),
      monthlyVolume,
      escrowHeld,
      paidCount: paidLinks.length,
      unpaidCount: unpaidLinks.length,
      successRate: closed > 0 ? Math.round((success / closed) * 100) : 0,
      avgTicket:
        paidLinks.length > 0
          ? paidLinks.reduce(
              (sum, l) =>
                sum + convertAmount(l.amount, l.currency || currency, currency),
              0
            ) / paidLinks.length
          : 0,
      totalLinks: paymentLinks.length,
    };
  }, [paymentLinks, disputedLinkIds, currency]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#8a9bb0]">
            {profile?.full_name ? `Bonjour` : "FidexaPay"}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
            {profile?.full_name?.split(" ")[0] || "Tableau de bord"}
          </h1>
        </div>
        <Button asChild size="sm" className="h-9 bg-[#0b3b78] hover:bg-[#0a3266]">
          <Link to="/dashboard/create-link">
            <Plus className="mr-1 h-4 w-4" />
            Lien
          </Link>
        </Button>
      </div>

      {/* Hero finances */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-[#0b3b78] p-4 text-white sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex lg:min-h-[11.5rem] lg:flex-col lg:justify-between lg:p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
          <div>
            <p className="text-xs font-medium text-white/60">Fonds libérés</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatAmount(stats.monthlyVolume, currency)}
            </p>
          </div>
          <Link
            to="/dashboard/transactions"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white lg:mt-0"
          >
            Transactions <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e2eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#8a9bb0]">Escrow en cours</p>
            <Shield className="h-4 w-4 text-[#0b3b78]" strokeWidth={1.75} />
          </div>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-[#0b2f63]">
            {formatAmount(stats.escrowHeld, currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8a9bb0]">{stats.paidCount} paiements reçus</p>
        </div>

        <Link
          to="/dashboard/withdrawal"
          className="rounded-2xl border border-[#e2eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(11,59,120,0.04)] transition-colors hover:border-[#c5d4e8]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#8a9bb0]">Retraits</p>
            <Wallet className="h-4 w-4 text-[#178c52]" strokeWidth={1.75} />
          </div>
          <p className="mt-1.5 text-xl font-semibold text-[#0b3b78]">Solde</p>
          <p className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#178c52]">
            Demander <ArrowUpRight className="h-3 w-3" />
          </p>
        </Link>
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { to: "/dashboard/active-orders", label: "À livrer", value: stats.pending, icon: Clock, tone: "text-[#b8860b] bg-[#fff8e8]" },
          { to: "/dashboard/orders?filter=delivered", label: "Validées", value: stats.delivered, icon: CheckCircle, tone: "text-[#178c52] bg-[#edf9f2]" },
          { to: "/dashboard/orders?filter=cancelled", label: "Annulées", value: stats.cancelled, icon: XCircle, tone: "text-[#64748b] bg-[#f1f5f9]" },
          { to: "/dashboard/orders?filter=disputed", label: "Litiges", value: stats.dispute, icon: AlertTriangle, tone: "text-[#0b3b78] bg-[#eef4ff]" },
        ].map((m) => (
          <Link
            key={m.label}
            to={m.to}
            className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)] transition-colors hover:border-[#c5d4e8]"
          >
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${m.tone}`}>
              <m.icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <p className="mt-2 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">{m.value}</p>
            <p className="mt-1 text-[11px] font-medium text-[#8a9bb0]">{m.label}</p>
          </Link>
        ))}
      </section>

      {/* Insights */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[#0b3b78]" strokeWidth={1.75} />
            <p className="text-[11px] font-medium text-[#8a9bb0]">Succès</p>
          </div>
          <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {stats.successRate}%
          </p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="flex items-center gap-1.5">
            <CircleDollarSign className="h-3.5 w-3.5 text-[#0b3b78]" strokeWidth={1.75} />
            <p className="text-[11px] font-medium text-[#8a9bb0]">Ticket moyen</p>
          </div>
          <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {formatAmount(stats.avgTicket, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-[#0b3b78]" strokeWidth={1.75} />
            <p className="text-[11px] font-medium text-[#8a9bb0]">Liens ouverts</p>
          </div>
          <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {stats.unpaidCount}
          </p>
        </div>
        <Link
          to="/dashboard/active-orders"
          className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)] transition-colors hover:border-[#c5d4e8]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 text-[#0b3b78]" strokeWidth={1.75} />
              <p className="text-[11px] font-medium text-[#8a9bb0]">Actives</p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#0b3b78]" />
          </div>
          <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-[#0b2f63]">
            {stats.pending}
          </p>
        </Link>
      </section>

      {/* Accès rapides */}
      <section className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <div className="border-b border-[#eef3f9] px-4 py-2.5">
          <h2 className="text-sm font-semibold leading-none text-[#0b2f63]">Accès rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#eef3f9] sm:grid-cols-4">
          {[
            { to: "/dashboard/create-link", label: "Créer un lien", icon: Plus },
            { to: "/dashboard/withdrawal", label: "Retirer", icon: Wallet },
            { to: "/dashboard/subscriptions", label: "Abonnement", icon: Sparkles },
            { to: "/dashboard/support", label: "Support", icon: Headphones },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-2.5 bg-white px-4 py-3 transition-colors hover:bg-[#f7fafd]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0b3b78]/8 text-[#0b3b78]">
                <a.icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-semibold leading-tight text-[#0b2f63]">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Santé du compte */}
      <section className="grid gap-2.5 sm:grid-cols-2">
        <Link
          to={profile?.kyc_status === "verified" ? "/dashboard/profile" : "/dashboard/kyc"}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2eaf3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)] transition-colors hover:border-[#c5d4e8]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                profile?.kyc_status === "verified"
                  ? "bg-[#edf9f2] text-[#178c52]"
                  : "bg-[#fff8e8] text-[#b8860b]"
              }`}
            >
              <BadgeCheck className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 leading-none">
              <p className="text-sm font-semibold text-[#0b2f63]">Identité</p>
              <p className="mt-1 text-[11px] text-[#8a9bb0]">
                {profile?.kyc_status === "verified"
                  ? "Profil vérifié"
                  : profile?.kyc_status === "pending"
                    ? "Vérification en cours"
                    : "À vérifier pour les retraits"}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#0b3b78]" />
        </Link>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2eaf3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#0b3b78]">
              <Shield className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 leading-none">
              <p className="text-sm font-semibold text-[#0b2f63]">Activité</p>
              <p className="mt-1 text-[11px] text-[#8a9bb0]">
                {stats.totalLinks} lien{stats.totalLinks > 1 ? "s" : ""} · {stats.paidCount} payé
                {stats.paidCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <RecentLinksSection paymentLinks={paymentLinks} currency={currency} />
    </div>
  );
};

export default Dashboard;
