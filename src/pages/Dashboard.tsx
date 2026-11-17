import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Link2,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Wallet,
  CircleDollarSign,
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
}

const Dashboard = () => {
  const { currency } = useProvider();
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
    const releasedLinks = paidLinks.filter((l) => l.escrow_released === true);
    const monthlyVolume = releasedLinks.reduce(
      (sum, l) =>
        sum +
        convertAmount(l.net_amount || l.amount, l.currency || currency, currency),
      0
    );

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
      cancelled: paidLinks.filter((l) => l.order_status === "cancelled")
        .length,
      dispute: Math.max(
        paidLinks.filter((l) => l.order_status === "disputed").length,
        paidLinks.filter((l) => disputedLinkIds.has(l.id)).length
      ),
      monthlyVolume,
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
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-[#5c7188]">Aperçu de votre activité</p>
        </div>
        <Button asChild className="w-full bg-[#0b3b78] hover:bg-[#0a3266] sm:w-auto">
          <Link to="/dashboard/create-link">
            <Plus className="mr-2 h-4 w-4" />
            Créer un lien
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl bg-[#0b3b78] p-6 text-white shadow-[0_18px_40px_rgba(11,59,120,.22)] sm:min-h-52 sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-[#2bb673]/10"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/70">Fonds libérés ce mois</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatAmount(stats.monthlyVolume, currency)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#6ce0a0] ring-1 ring-white/15">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="relative flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-sm text-white/75">
            <span>Net de commission</span>
            <Link
              to="/dashboard/transactions"
              className="inline-flex items-center gap-1 font-medium text-white hover:text-[#6ce0a0]"
            >
              Transactions <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <Link
          to="/dashboard/withdrawal"
          className="group flex min-h-44 flex-col justify-between rounded-2xl border border-[#c5e6d4] bg-gradient-to-br from-[#eff8f3] to-white p-6 shadow-[0_10px_28px_rgba(11,59,120,.06)] transition-transform hover:-translate-y-0.5 sm:min-h-52"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b3b78] text-white shadow-[0_8px_16px_rgba(11,59,120,.2)]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#56736a]">Retraits</p>
            <p className="mt-1 text-lg font-semibold text-[#0b3b78]">Solde disponible</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#178c52] group-hover:gap-1.5">
            Demander un retrait <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            to: "/dashboard/active-orders",
            label: "À livrer",
            value: stats.pending,
            icon: Clock,
            iconBg: "bg-[#fff6e8] text-[#a96500]",
            accent: "border-l-[#f0b429]",
          },
          {
            to: "/dashboard/orders?filter=delivered",
            label: "Validées",
            value: stats.delivered,
            icon: CheckCircle,
            iconBg: "bg-[#edf9f2] text-[#178c52]",
            accent: "border-l-[#2bb673]",
          },
          {
            to: "/dashboard/orders?filter=cancelled",
            label: "Annulées",
            value: stats.cancelled,
            icon: XCircle,
            iconBg: "bg-[#f2f5f8] text-[#63758a]",
            accent: "border-l-[#94a3b8]",
          },
          {
            to: "/dashboard/orders?filter=disputed",
            label: "Litiges",
            value: stats.dispute,
            icon: AlertTriangle,
            iconBg: "bg-[#eef5ff] text-[#1354b8]",
            accent: "border-l-[#0b3b78]",
          },
        ].map((metric) => (
          <Link
            key={metric.label}
            to={metric.to}
            className={`group rounded-2xl border border-[#dbe6f2] border-l-4 ${metric.accent} bg-white p-4 shadow-[0_8px_24px_rgba(11,59,120,.06)] transition-all hover:-translate-y-0.5 hover:border-[#b8cce0] hover:shadow-[0_14px_32px_rgba(11,59,120,.1)] sm:p-5`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.iconBg}`}>
              <metric.icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-[#0b2f63] sm:mt-5 sm:text-3xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-medium text-[#5b738c] sm:text-sm">{metric.label}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#0b2f63]">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { to: "/dashboard/create-link", label: "Nouveau lien", icon: Link2 },
            { to: "/dashboard/orders", label: "Commandes", icon: Package },
            { to: "/dashboard/subscriptions", label: "Abonnement", icon: TrendingUp },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-3 rounded-2xl border border-[#dbe6f2] bg-white px-4 py-3.5 text-sm font-medium text-[#0b3b78] shadow-[0_6px_18px_rgba(11,59,120,.04)] transition-all hover:border-[#0b3b78]/30 hover:bg-[#f3f7fc]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b3b78]/8 text-[#0b3b78]">
                <action.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold text-[#0b2f63]">Liens récents</h2>
          <Button variant="ghost" size="sm" asChild className="shrink-0 text-[#0b3b78]">
            <Link to="/dashboard/orders">Voir tout</Link>
          </Button>
        </div>
        {paymentLinks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dbe6f2] bg-white py-10 text-center text-sm text-[#5c7188]">
            Aucun lien de paiement
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#dbe6f2] bg-white shadow-[0_8px_24px_rgba(11,59,120,.05)]">
            <div className="divide-y divide-[#eef3f9]">
              {paymentLinks.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3b78]/8 text-[#0b3b78]">
                      <Package className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#0b2f63]">{link.client_name}</p>
                      <p className="truncate text-xs text-[#5c7188]">
                        {link.link_id} · {new Date(link.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className="font-semibold text-[#0b2f63]">
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
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
