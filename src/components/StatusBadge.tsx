import { Badge } from "@/components/ui/badge";

export type OrderStatus = "pending" | "delivered" | "cancelled" | "dispute";

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "pending" | "delivered" | "cancelled" | "dispute" }
> = {
  pending: { label: "En cours", variant: "pending" },
  delivered: { label: "Livré", variant: "delivered" },
  cancelled: { label: "Annulé", variant: "cancelled" },
  dispute: { label: "En litige", variant: "dispute" },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default StatusBadge;
