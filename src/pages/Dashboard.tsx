import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
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
      cancelled: paidLinks.filter((l) => l.order_status === "cancelled").length,
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">
        Tableau de bord
      </h1>

      <section className="grid gap-3 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl bg-[#0b3b78] p-5 text-white sm:min-h-48 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/65">Fonds libérés</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {formatAmount(stats.monthlyVolume, currency)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#6ce0a0]">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="relative flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-sm text-white/70">
            <span>Ce mois · net</span>
            <Link to="/dashboard/transactions" className="inline-flex items-center gap-1 font-medium text-white">
              Voir <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <Link
          to="/dashboard/withdrawal"
          className="flex min-h-40 flex-col justify-between rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] transition-colors hover:bg-[#f7fafd] sm:min-h-48 sm:p-7"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3b78] text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-[#5c7188]">Retraits</p>
            <p className="mt-0.5 text-lg font-semibold text-[#0b3b78]">Solde disponible</p>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { to: "/dashboard/active-orders", label: "À livrer", value: stats.pending, icon: Clock },
          { to: "/dashboard/orders?filter=delivered", label: "Validées", value: stats.delivered, icon: CheckCircle },
          { to: "/dashboard/orders?filter=cancelled", label: "Annulées", value: stats.cancelled, icon: XCircle },
          { to: "/dashboard/orders?filter=disputed", label: "Litiges", value: stats.dispute, icon: AlertTriangle },
        ].map((metric) => (
          <Link
            key={metric.label}
            to={metric.to}
            className="rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] transition-colors hover:bg-[#f7fafd] sm:p-5"
          >
            <metric.icon className="h-5 w-5 text-[#0b3b78]" strokeWidth={1.75} />
            <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums text-[#0b2f63] sm:text-3xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-medium text-[#5b738c] sm:text-sm">{metric.label}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#0b2f63]">Liens récents</h2>
          <Button variant="ghost" size="sm" asChild className="shrink-0 text-[#0b3b78]">
            <Link to="/dashboard/orders">Voir tout</Link>
          </Button>
        </div>
        {paymentLinks.length === 0 ? (
          <div className="rounded-2xl bg-white py-10 text-center text-sm text-[#5c7188] ring-1 ring-[#dbe6f2]">
            Aucun lien
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#dbe6f2]">
            <div className="divide-y divide-[#eef3f9]">
              {paymentLinks.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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
                    <p className="font-semibold tabular-nums text-[#0b2f63]">
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
