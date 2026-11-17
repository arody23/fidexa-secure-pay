import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MoreVertical, Copy, CheckCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { value: "all", label: "Tous" },
  { value: "pending", label: "En cours" },
  { value: "delivered", label: "Livrés" },
  { value: "cancelled", label: "Annulés" },
  { value: "disputed", label: "Litiges" },
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
          order.order_status === "validated" || order.order_status === "completed";
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

  const copyOrderLink = async (linkId: string) => {
    const url = `${window.location.origin}/pay/${linkId}`;
    const ok = await copyToClipboard(url);
    setCopiedId(ok ? linkId : null);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: ok ? "Lien copié" : "Copie manuelle",
      description: ok ? "Copié." : url,
    });
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">Liens</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5c7188]" />
        <Input
          placeholder="Rechercher"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 border-0 bg-transparent pl-10 shadow-none ring-0 focus-visible:ring-0"
        />
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-[#0b3b78] text-white"
                : "text-[#5c7188] hover:bg-white/80"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#5c7188]">Aucun lien</p>
      ) : (
        <div className="divide-y divide-[#e4edf6]">
          {filteredOrders.map((order) => (
            <div key={order.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  <Link2 className="mt-1 h-4 w-4 shrink-0 text-[#0b3b78]" strokeWidth={1.8} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[#0b2f63]">{order.client_name}</p>
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
                    <p className="line-clamp-1 text-sm text-[#5c7188]">{order.description}</p>
                    <p className="text-xs text-[#5c7188]">
                      {new Date(order.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="font-semibold tabular-nums text-[#0b2f63]">
                    {formatAmount(
                      convertAmount(order.amount, order.currency || currency, currency),
                      currency
                    )}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5c7188]">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => copyOrderLink(order.link_id)}>
                        {copiedId === order.link_id ? (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                        Détails
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#041628]/45 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5">
            <h2 className="text-lg font-semibold text-[#0b2f63]">Détail</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#5c7188]">Client</span>
                <span className="text-right font-medium text-[#0b2f63]">{selectedOrder.client_name}</span>
              </div>
              <div>
                <span className="text-[#5c7188]">Prestation</span>
                <p className="mt-1 font-medium text-[#0b2f63]">{selectedOrder.description}</p>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#5c7188]">Montant</span>
                <span className="font-semibold tabular-nums text-[#0b2f63]">
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
                <span className="text-[#5c7188]">Statut</span>
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
              <div className="flex gap-2 pt-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => copyOrderLink(selectedOrder.link_id)}
                >
                  Copier le lien
                </Button>
                <Button
                  className="flex-1 bg-[#0b3b78] hover:bg-[#0a3266]"
                  onClick={() => setSelectedOrder(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
