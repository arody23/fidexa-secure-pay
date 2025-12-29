import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Search, MoreVertical, Check, X, AlertTriangle, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentLink {
  id: string;
  link_id: string;
  client_name: string | null;
  client_email: string | null;
  amount: number;
  status: string;
  created_at: string;
  description: string;
  delivery_days: number;
}

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payées" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
  { value: "disputed", label: "En litige" },
];

const Orders = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setOrders(data);
      }

      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.client_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      order.link_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const mapStatus = (status: string): OrderStatus => {
    switch (status) {
      case "pending":
        return "pending";
      case "paid":
        return "pending";
      case "delivered":
        return "delivered";
      case "cancelled":
        return "cancelled";
      case "disputed":
        return "dispute";
      default:
        return "pending";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            Commandes
          </h1>
          <p className="text-muted-foreground">
            Gérez et suivez toutes vos commandes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commande..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "transition-all",
                  statusFilter === filter.value && "shadow-md"
                )}
              >
                {filter.label}
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
                  {getStatusCount(filter.value)}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">Aucune commande pour le moment</p>
                <Button variant="hero" asChild>
                  <Link to="/dashboard/create-link">
                    <Link2 className="mr-2 h-4 w-4" />
                    Créer votre premier lien
                  </Link>
                </Button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucune commande trouvée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Order Info */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{order.client_name || "Client"}</p>
                            <StatusBadge status={mapStatus(order.status)} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.link_id} • {order.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Créé le {new Date(order.created_at).toLocaleDateString("fr-FR")} • Livraison: {order.delivery_days} jours
                          </p>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <p className="font-display text-xl font-bold">
                          {order.amount.toLocaleString()} FCFA
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/pay/${order.link_id}`
                                );
                              }}
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              Copier le lien
                            </DropdownMenuItem>
                            {(order.status === "pending" || order.status === "paid") && (
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
                            {order.status === "disputed" && (
                              <DropdownMenuItem>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Voir le litige
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
