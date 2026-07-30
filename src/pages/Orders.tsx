import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Search, MoreVertical, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { useProvider } from "@/contexts/ProviderContext";
import { useProviderPaymentLinks } from "@/hooks/useProviderPaymentLinks";
import { formatAmount, convertAmount } from "@/lib/currency";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency?: string;
  status: OrderStatus;
  order_status?: string;
  created_at: string;
  description: string;
  delivery_days: number;
  is_paid: boolean;
}

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En cours" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
  { value: "disputed", label: "En litige" },
];

const Orders = () => {
  const { currency } = useProvider();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(filterParam || "all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: rawLinks, loading } = useProviderPaymentLinks();

  const orders = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || "Client",
        client_email: (link.client_email as string) || "N/A",
        amount: link.amount as number,
        currency: (link.currency as string) || undefined,
        status: (link.status || "pending") as OrderStatus,
        order_status: link.order_status as string | undefined,
        created_at: link.created_at as string,
        description: link.description as string,
        delivery_days: link.delivery_days as number,
        is_paid: Boolean(link.is_paid),
      })) as Order[],
    [rawLinks]
  );

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.link_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== "all" && order.is_paid) {
      if (statusFilter === "pending") {
        matchesStatus =
          !order.order_status ||
          order.order_status === "paid" ||
          order.order_status === "started";
      } else if (statusFilter === "delivered") {
        matchesStatus =
          order.order_status === "validated" ||
          order.order_status === "completed";
      } else if (statusFilter === "cancelled") {
        matchesStatus = order.order_status === "cancelled";
      } else if (statusFilter === "disputed") {
        matchesStatus = order.order_status === "disputed";
      }
    } else if (statusFilter !== "all" && !order.is_paid) {
      matchesStatus = statusFilter === "pending";
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    const paidOrders = orders.filter((o) => o.is_paid);
    if (status === "all") return orders.length;
    if (status === "pending") {
      return paidOrders.filter(
        (o) =>
          !o.order_status ||
          o.order_status === "paid" ||
          o.order_status === "started"
      ).length;
    }
    if (status === "delivered") {
      return paidOrders.filter(
        (o) => o.order_status === "validated" || o.order_status === "completed"
      ).length;
    }
    if (status === "cancelled") {
      return paidOrders.filter((o) => o.order_status === "cancelled").length;
    }
    if (status === "disputed") {
      return paidOrders.filter((o) => o.order_status === "disputed").length;
    }
    return 0;
  };

  const copyOrderLink = async (linkId: string) => {
    const url = `${window.location.origin}/pay/${linkId}`;
    const ok = await copyToClipboard(url);
    setCopiedId(ok ? linkId : null);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: ok ? 'Lien copié' : 'Copie manuelle',
      description: ok ? 'Lien de paiement copié.' : url,
    });
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Commandes</h1>
        <p className="text-muted-foreground">
          Gérez et suivez toutes vos commandes
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une commande..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
                {getStatusCount(filter.value)}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-5 w-5 shrink-0 text-primary" />
            {filteredOrders.length} commande
            {filteredOrders.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucune commande trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-border p-3 sm:p-4 hover:border-primary/30"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted sm:h-12 sm:w-12">
                        <Package className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{order.client_name}</p>
                          <StatusBadge
                            status={
                              (order.is_paid
                                ? order.status === "pending"
                                  ? "paid"
                                  : order.status
                                : order.status) as OrderStatus
                            }
                          />
                        </div>
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {order.link_id}
                        </p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {order.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("fr-FR")} · {order.delivery_days}j
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <p className="text-base font-semibold sm:text-lg">
                        {formatAmount(
                          convertAmount(order.amount, order.currency || currency, currency),
                          currency
                        )}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <MoreVertical className="h-4 w-4" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => copyOrderLink(order.link_id)}>
                            {copiedId === order.link_id ? (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Copier le lien
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Package className="mr-2 h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
          <Card className="max-h-[85vh] w-full max-w-md overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg">Détail de la commande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium text-right">{selectedOrder.client_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Lien</span>
                <span className="max-w-[60%] truncate font-mono text-xs">{selectedOrder.link_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Description</span>
                <p className="mt-1 font-medium">{selectedOrder.description}</p>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-semibold">
                  {formatAmount(
                    convertAmount(
                      selectedOrder.amount,
                      selectedOrder.currency || currency,
                      currency
                    ),
                    currency
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Statut</span>
                <StatusBadge
                  status={
                    (selectedOrder.is_paid
                      ? selectedOrder.status === "pending"
                        ? "paid"
                        : selectedOrder.status
                      : selectedOrder.status) as OrderStatus
                  }
                />
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Créé le</span>
                <span>{new Date(selectedOrder.created_at).toLocaleString("fr-FR")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Délai</span>
                <span>{selectedOrder.delivery_days} jours</span>
              </div>
              {(selectedOrder.order_status === "completed") && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  En attente de la validation du client
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" variant="outline" onClick={() => copyOrderLink(selectedOrder.link_id)}>
                  Copier le lien
                </Button>
                <Button className="flex-1" onClick={() => setSelectedOrder(null)}>
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Orders;
