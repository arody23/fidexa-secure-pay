import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Search, MoreVertical, Check, X, AlertTriangle, Copy, CheckCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useProvider } from "@/contexts/ProviderContext";
import { useProviderPaymentLinks } from "@/hooks/useProviderPaymentLinks";
import { formatAmount } from "@/lib/currency";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
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

  const { data: rawLinks, loading } = useProviderPaymentLinks();

  const orders = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || "Client",
        client_email: (link.client_email as string) || "N/A",
        amount: link.amount as number,
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Commandes</h1>
        <p className="text-muted-foreground">
          Gérez et suivez toutes vos commandes
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une commande..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {filteredOrders.length} commande
            {filteredOrders.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  className="rounded-xl border border-border p-4 hover:border-primary/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{order.client_name}</p>
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
                        <p className="text-sm text-muted-foreground">
                          {order.link_id} · {order.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créé le{" "}
                          {new Date(order.created_at).toLocaleDateString("fr-FR")}{" "}
                          · Livraison: {order.delivery_days}j
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold">
                        {formatAmount(order.amount, currency)}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === "pending" && (
                            <>
                              <DropdownMenuItem className="text-success">
                                <Check className="mr-2 h-4 w-4" />
                                Marquer comme livré
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-warning">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Ouvrir un litige
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <X className="mr-2 h-4 w-4" />
                                Annuler
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => copyOrderLink(order.link_id)}>
                            {copiedId === order.link_id ? (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Copier le lien
                          </DropdownMenuItem>
                          <DropdownMenuItem>
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
    </div>
  );
};

export default Orders;
