import {
  Clock,
  CheckCircle2,
  PlayCircle,
  PackageCheck,
  BadgeCheck,
  Truck,
  XCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "pending"
  | "paid"
  | "started"
  | "completed"
  | "validated"
  | "delivered"
  | "cancelled"
  | "dispute"
  | "disputed";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-[#fff8e8] text-[#b8860b]",
  },
  paid: {
    label: "Payé",
    icon: CheckCircle2,
    className: "bg-[#edf9f2] text-[#178c52]",
  },
  started: {
    label: "En cours",
    icon: PlayCircle,
    className: "bg-[#eef4ff] text-[#0b3b78]",
  },
  completed: {
    label: "Terminé",
    icon: PackageCheck,
    className: "bg-[#edf9f2] text-[#178c52]",
  },
  validated: {
    label: "Validé",
    icon: BadgeCheck,
    className: "bg-[#edf9f2] text-[#178c52]",
  },
  delivered: {
    label: "Livré",
    icon: Truck,
    className: "bg-[#edf9f2] text-[#178c52]",
  },
  cancelled: {
    label: "Annulé",
    icon: XCircle,
    className: "bg-[#f1f5f9] text-[#64748b]",
  },
  dispute: {
    label: "Litige",
    icon: AlertTriangle,
    className: "bg-[#fff1f0] text-[#c0392b]",
  },
  disputed: {
    label: "Litige",
    icon: AlertTriangle,
    className: "bg-[#fff1f0] text-[#c0392b]",
  },
};

/** Badge d’état compact : icône seule + tooltip (évite le débordement dans les listes) */
export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      title={config.label}
      aria-label={config.label}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
    </span>
  );
};

export default StatusBadge;
