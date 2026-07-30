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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/StatCard";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useProvider } from "@/contexts/ProviderContext";
import { useProviderPaymentLinks } from "@/hooks/useProviderPaymentLinks";
import { formatAmount } from "@/lib/currency";

interface PaymentLink {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
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
      (sum, l) => sum + (l.net_amount || l.amount),
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
  }, [paymentLinks, disputedLinkIds]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <Card className="order-first">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Gains après commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {formatAmount(stats.monthlyVolume, currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total des fonds libérés ce mois (net de commission)
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/dashboard/active-orders">
          <StatCard
            title="En cours"
            value={stats.pending}
            icon={<Clock className="h-6 w-6" />}
            variant="warning"
          />
        </Link>
        <Link to="/dashboard/orders?filter=delivered">
          <StatCard
            title="Livrées"
            value={stats.delivered}
            icon={<CheckCircle className="h-6 w-6" />}
            variant="success"
          />
        </Link>
        <Link to="/dashboard/orders?filter=cancelled">
          <StatCard
            title="Annulées"
            value={stats.cancelled}
            icon={<XCircle className="h-6 w-6" />}
            variant="default"
          />
        </Link>
        <Link to="/dashboard/orders?filter=disputed">
          <StatCard
            title="En litige"
            value={stats.dispute}
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="primary"
          />
        </Link>
      </div>

      <Card>
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
                      {formatAmount(link.amount, currency)}
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
