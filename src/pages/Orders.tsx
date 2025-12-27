import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, Filter, MoreVertical, Check, X, AlertTriangle } from "lucide-react";
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

interface Order {
  id: string;
  client: string;
  email: string;
  amount: number;
  status: OrderStatus;
  date: string;
  description: string;
  deliveryDate: string;
}

const mockOrders: Order[] = [
  {
    id: "ORD-001",
    client: "Sophie Martin",
    email: "sophie@email.com",
    amount: 250,
    status: "pending",
    date: "2024-01-15",
    description: "Design logo entreprise",
    deliveryDate: "2024-01-22",
  },
  {
    id: "ORD-002",
    client: "Pierre Dupont",
    email: "pierre@email.com",
    amount: 1500,
    status: "delivered",
    date: "2024-01-14",
    description: "Développement site web",
    deliveryDate: "2024-01-28",
  },
  {
    id: "ORD-003",
    client: "Marie Claire",
    email: "marie@email.com",
    amount: 89,
    status: "dispute",
    date: "2024-01-13",
    description: "Création flyer événement",
    deliveryDate: "2024-01-16",
  },
  {
    id: "ORD-004",
    client: "Jean Petit",
    email: "jean@email.com",
    amount: 450,
    status: "delivered",
    date: "2024-01-12",
    description: "Montage vidéo promotionnel",
    deliveryDate: "2024-01-19",
  },
  {
    id: "ORD-005",
    client: "Claire Dubois",
    email: "claire@email.com",
    amount: 320,
    status: "cancelled",
    date: "2024-01-11",
    description: "Refonte identité visuelle",
    deliveryDate: "2024-01-25",
  },
  {
    id: "ORD-006",
    client: "Lucas Bernard",
    email: "lucas@email.com",
    amount: 780,
    status: "pending",
    date: "2024-01-10",
    description: "Application mobile MVP",
    deliveryDate: "2024-02-10",
  },
  {
    id: "ORD-007",
    client: "Emma Wilson",
    email: "emma@email.com",
    amount: 150,
    status: "delivered",
    date: "2024-01-09",
    description: "Rédaction articles blog",
    deliveryDate: "2024-01-16",
  },
];

const statusFilters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En cours" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
  { value: "dispute", label: "En litige" },
];

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: OrderStatus | "all") => {
    if (status === "all") return mockOrders.length;
    return mockOrders.filter((o) => o.status === status).length;
  };

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
            {filteredOrders.length === 0 ? (
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
                            <p className="font-semibold">{order.client}</p>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.id} • {order.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Créé le {order.date} • Livraison prévue: {order.deliveryDate}
                          </p>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <p className="font-display text-xl font-bold">
                          ${order.amount}
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
                            {order.status === "dispute" && (
                              <DropdownMenuItem>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Voir le litige
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Package className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
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
