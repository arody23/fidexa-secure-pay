import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";

// Mock data
const stats = {
  pending: 12,
  delivered: 48,
  cancelled: 3,
  dispute: 2,
  monthlyVolume: 15420,
  monthlyLimit: 20000,
};

const recentOrders = [
  {
    id: "ORD-001",
    client: "Sophie Martin",
    amount: 250,
    status: "pending" as OrderStatus,
    date: "2024-01-15",
  },
  {
    id: "ORD-002",
    client: "Pierre Dupont",
    amount: 1500,
    status: "delivered" as OrderStatus,
    date: "2024-01-14",
  },
  {
    id: "ORD-003",
    client: "Marie Claire",
    amount: 89,
    status: "dispute" as OrderStatus,
    date: "2024-01-13",
  },
  {
    id: "ORD-004",
    client: "Jean Petit",
    amount: 450,
    status: "delivered" as OrderStatus,
    date: "2024-01-12",
  },
  {
    id: "ORD-005",
    client: "Claire Dubois",
    amount: 320,
    status: "cancelled" as OrderStatus,
    date: "2024-01-11",
  },
];

const Dashboard = () => {
  const volumePercentage = (stats.monthlyVolume / stats.monthlyLimit) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Bienvenue! Voici un aperçu de votre activité.
            </p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/dashboard/create-link">
              <Plus className="mr-2 h-4 w-4" />
              Créer un lien
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="En cours"
            value={stats.pending}
            icon={<Clock className="h-6 w-6" />}
            variant="warning"
          />
          <StatCard
            title="Livrées"
            value={stats.delivered}
            icon={<CheckCircle className="h-6 w-6" />}
            variant="success"
            trend={{ value: 12, label: "ce mois" }}
          />
          <StatCard
            title="Annulées"
            value={stats.cancelled}
            icon={<XCircle className="h-6 w-6" />}
            variant="default"
          />
          <StatCard
            title="En litige"
            value={stats.dispute}
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="primary"
          />
        </div>

        {/* Volume & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly Volume */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Volume mensuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-display text-4xl font-bold">
                        ${stats.monthlyVolume.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        sur ${stats.monthlyLimit.toLocaleString()} disponibles
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {volumePercentage.toFixed(0)}%
                      </p>
                      <p className="text-sm text-muted-foreground">utilisé</p>
                    </div>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${volumePercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/dashboard/create-link">
                    <Link2 className="mr-2 h-4 w-4" />
                    Nouveau lien de paiement
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/dashboard/orders">
                    <Package className="mr-2 h-4 w-4" />
                    Voir toutes les commandes
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/dashboard/profile">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Gérer mon abonnement
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Commandes récentes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/orders">Voir tout</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{order.client}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.id} • {order.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display font-semibold">
                        ${order.amount}
                      </p>
                      <StatusBadge status={order.status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
