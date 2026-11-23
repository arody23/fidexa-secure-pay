import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MoreVertical, Copy, CheckCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { getPublicPaymentUrl } from "@/lib/native";

interface Order {
  id: string;
  link_id: string;
  client_name: string;
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
  const [statusFilter, setStatusFilter] = useState<string>(filterParam || "all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: rawLinks, loading } = useProviderPaymentLinks();

  const orders = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || "Client",
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
    return matchesStatus;
  });

  const copyOrderLink = async (linkId: string) => {
    const url = getPublicPaymentUrl(linkId);
    const ok = await copyToClipboard(url);
    setCopiedId(ok ? linkId : null);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: ok ? "Lien copié" : "Copie manuelle", description: ok ? "Copié." : url });
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">Liens</h1>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-[#e8eef6] p-1">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === filter.value
                ? "bg-white text-[#0b3b78] shadow-sm"
                : "text-[#5c7188]"
            )}
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
        <div className="rounded-2xl border border-[#e2eaf3] bg-white py-12 text-center text-sm text-[#8a9bb0]">
          Aucun lien
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="divide-y divide-[#eef3f9]">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0b3b78]/8 text-[#0b3b78]">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 leading-none">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#0b2f63]">{order.client_name}</p>
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
                    <p className="mt-0.5 truncate text-[11px] text-[#8a9bb0]">
                      {order.description} · {new Date(order.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <p className="text-sm font-semibold tabular-nums text-[#0b2f63]">
                    {formatAmount(
                      convertAmount(order.amount, order.currency || currency, currency),
                      currency
                    )}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8a9bb0]">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
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
            ))}
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#041628]/45 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e2eaf3] bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-[#0b2f63]">Détail</h2>
            <div className="mt-3 space-y-2.5 text-sm leading-snug">
              <div className="flex justify-between gap-2">
                <span className="text-[#8a9bb0]">Client</span>
                <span className="font-medium text-[#0b2f63]">{selectedOrder.client_name}</span>
              </div>
              <div>
                <span className="text-[#8a9bb0]">Prestation</span>
                <p className="mt-0.5 font-medium text-[#0b2f63]">{selectedOrder.description}</p>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#8a9bb0]">Montant</span>
                <span className="font-semibold tabular-nums text-[#0b2f63]">
                  {formatAmount(
                    convertAmount(selectedOrder.amount, selectedOrder.currency || currency, currency),
                    currency
                  )}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" variant="outline" onClick={() => copyOrderLink(selectedOrder.link_id)}>
                  Copier
                </Button>
                <Button className="flex-1 bg-[#0b3b78] hover:bg-[#0a3266]" onClick={() => setSelectedOrder(null)}>
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
