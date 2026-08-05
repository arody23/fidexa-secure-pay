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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aperçu de votre activité
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/dashboard/create-link">
            <Plus className="mr-2 h-4 w-4" />
            Créer un lien
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <Card className="border-[#d6e3f1] bg-[#0b3b78] text-white shadow-[0_18px_45px_rgba(11,59,120,.16)]">
          <CardContent className="flex min-h-52 flex-col justify-between p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/70">Fonds libérés ce mois</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{formatAmount(stats.monthlyVolume, currency)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#6ce0a0]">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-sm text-white/75">
              <span>Net de commission</span>
              <Link to="/dashboard/transactions" className="inline-flex items-center gap-1 font-medium text-white hover:text-[#6ce0a0]">
                Voir les transactions <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
        <Link to="/dashboard/withdrawal" className="group">
          <Card className="h-full border-[#d6e3f1] bg-[#eff8f3] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#94d9b5]">
            <CardContent className="flex min-h-52 flex-col justify-between p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#178c52] shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#56736a]">Retraits prestataire</p>
                <p className="mt-1 text-lg font-semibold text-[#0b3b78]">Gérez votre solde disponible</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#178c52]">Demander un retrait <ArrowUpRight className="h-4 w-4" /></span>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { to: "/dashboard/active-orders", label: "À livrer ou à suivre", value: stats.pending, icon: Clock, tone: "text-[#a96500] bg-[#fff6e8]" },
          { to: "/dashboard/orders?filter=delivered", label: "Commandes validées", value: stats.delivered, icon: CheckCircle, tone: "text-[#178c52] bg-[#edf9f2]" },
          { to: "/dashboard/orders?filter=cancelled", label: "Commandes annulées", value: stats.cancelled, icon: XCircle, tone: "text-[#63758a] bg-[#f2f5f8]" },
          { to: "/dashboard/orders?filter=disputed", label: "Dossiers à résoudre", value: stats.dispute, icon: AlertTriangle, tone: "text-[#1354b8] bg-[#eef5ff]" },
        ].map((metric) => (
          <Link key={metric.label} to={metric.to} className="group">
            <Card className="h-full border-[#dce7f3] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#9fc0e7]">
              <CardContent className="p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>
                  <metric.icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="mt-6 text-3xl font-semibold tracking-tight text-[#0b2f63]">{metric.value}</p>
                <p className="mt-1 text-sm text-[#5b738c]">{metric.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <Card className="border-[#dce7f3]">
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/create-link">
                <Link2 className="mr-2 h-4 w-4" />
                Nouveau lien
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/orders">
                <Package className="mr-2 h-4 w-4" />
                Commandes
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/subscriptions">
                <TrendingUp className="mr-2 h-4 w-4" />
                Abonnement
              </Link>
            </Button>
          </CardContent>
        </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6">
          <CardTitle className="truncate text-lg">Liens de paiement récents</CardTitle>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to="/dashboard/orders">Voir tout</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-hidden px-4 sm:px-6">
          {paymentLinks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun lien de paiement créé
            </div>
          ) : (
            <div className="space-y-3">
              {paymentLinks.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{link.client_name}</p>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">
                        {link.link_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className="font-semibold">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
