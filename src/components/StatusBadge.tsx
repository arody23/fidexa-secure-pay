import { Badge } from "@/components/ui/badge";

export type OrderStatus = "pending" | "paid" | "started" | "completed" | "validated" | "delivered" | "cancelled" | "dispute" | "disputed";

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "pending" | "delivered" | "cancelled" | "dispute" }
> = {
  pending: { label: "En attente", variant: "pending" },
  paid: { label: "Payé", variant: "delivered" },
  started: { label: "En cours", variant: "delivered" },
  completed: { label: "Terminé", variant: "delivered" },
  validated: { label: "Validé", variant: "delivered" },
  delivered: { label: "Livré", variant: "delivered" },
  cancelled: { label: "Annulé", variant: "cancelled" },
  dispute: { label: "En litige", variant: "dispute" },
  disputed: { label: "En litige", variant: "dispute" },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default StatusBadge;
