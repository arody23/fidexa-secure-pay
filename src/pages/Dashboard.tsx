import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentLink {
  id: string;
  link_id: string;
  client_name: string | null;
  amount: number;
  status: string;
  created_at: string;
  description: string;
}

interface ProfileData {
  monthly_volume: number | null;
  monthly_limit: number | null;
  display_name: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [linksResult, profileResult] = await Promise.all([
        supabase
          .from("payment_links")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("profiles")
          .select("monthly_volume, monthly_limit, display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (linksResult.data) {
        setPaymentLinks(linksResult.data);
      }

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const stats = {
    pending: paymentLinks.filter((l) => l.status === "pending").length,
    delivered: paymentLinks.filter((l) => l.status === "delivered").length,
    cancelled: paymentLinks.filter((l) => l.status === "cancelled").length,
    dispute: paymentLinks.filter((l) => l.status === "disputed").length,
    monthlyVolume: profile?.monthly_volume || 0,
    monthlyLimit: profile?.monthly_limit || 500000,
  };

  const volumePercentage = stats.monthlyLimit > 0 
    ? (stats.monthlyVolume / stats.monthlyLimit) * 100 
    : 0;

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Bienvenue{profile?.display_name ? `, ${profile.display_name}` : ""}! Voici un aperçu de votre activité.
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
                        {stats.monthlyVolume.toLocaleString()} FCFA
                      </p>
                      <p className="text-sm text-muted-foreground">
                        sur {stats.monthlyLimit.toLocaleString()} FCFA disponibles
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
                      animate={{ width: `${Math.min(volumePercentage, 100)}%` }}
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
              {paymentLinks.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Aucune commande pour le moment
                  </p>
                  <Button variant="hero" className="mt-4" asChild>
                    <Link to="/dashboard/create-link">
                      Créer votre premier lien
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentLinks.map((order, index) => (
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
                          <p className="font-medium">
                            {order.client_name || "Client"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.link_id} • {new Date(order.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-display font-semibold">
                          {order.amount.toLocaleString()} FCFA
                        </p>
                        <StatusBadge status={mapStatus(order.status)} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
