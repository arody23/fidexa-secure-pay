import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, Package, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import {
  convertToUSD,
  formatAmount,
  formatUSD,
  normalizeCurrency,
  commissionToUSD,
} from '@/lib/currency';

interface PaymentLink {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  commission_amount: number | null;
  escrow_released?: boolean;
  status: string;
  is_paid: boolean;
  created_at: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<PaymentLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_links' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const providerIds = [
        ...new Set((data || []).map((o) => o.provider_id).filter(Boolean)),
      ] as string[];

      let currencyMap: Record<string, string> = {};
      if (providerIds.length > 0) {
        const { data: providers } = await supabase
          .from('users')
          .select('id, currency')
          .in('id', providerIds);
        currencyMap = Object.fromEntries(
          (providers || []).map((p) => [p.id, normalizeCurrency(p.currency)])
        );
      }

      setOrders(
        (data || []).map((o) => ({
          id: o.id,
          link_id: o.link_id,
          client_name: o.client_name || '—',
          client_email: o.client_email || '—',
          amount: Number(o.amount) || 0,
          currency: (o.provider_id && currencyMap[o.provider_id]) || 'FCFA',
          commission_amount: o.commission_amount,
          escrow_released: o.escrow_released ?? undefined,
          status: o.status,
          is_paid: Boolean(o.is_paid),
          created_at: o.created_at,
        }))
      );
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    if (searchTerm) {
      filtered = filtered.filter(
        (o) =>
          o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.link_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus === 'paid') filtered = filtered.filter((o) => o.is_paid);
    else if (filterStatus === 'pending') filtered = filtered.filter((o) => !o.is_paid && o.status === 'pending');
    else if (filterStatus === 'cancelled') filtered = filtered.filter((o) => o.status === 'cancelled');
    return filtered;
  }, [orders, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const revenueUSD = filteredOrders
      .filter((o) => o.is_paid && o.escrow_released)
      .reduce((sum, o) => {
        const commission =
          o.commission_amount != null
            ? convertToUSD(o.commission_amount, o.currency)
            : commissionToUSD(o.amount, o.currency);
        return sum + commission;
      }, 0);
    return {
      total: filteredOrders.length,
      paid: filteredOrders.filter((o) => o.is_paid).length,
      pending: filteredOrders.filter((o) => !o.is_paid && o.status === 'pending').length,
      revenueUSD,
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion des commandes</h1>
        <p className="mt-2 text-muted-foreground">Total : {orders.length} commandes</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou lien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'paid', 'pending', 'cancelled'] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Toutes' : s === 'paid' ? 'Payées' : s === 'pending' ? 'En attente' : 'Annulées'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payées</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commissions libérées</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{formatUSD(stats.revenueUSD)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des commandes ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Montant (devise client)</th>
                  <th className="px-4 py-3 text-left">Équivalent USD</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune commande trouvée
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b transition-colors hover:bg-accent">
                      <td className="px-4 py-3 font-semibold">{order.client_name}</td>
                      <td className="px-4 py-3">{order.client_email}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatUSD(convertToUSD(order.amount, order.currency))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            order.is_paid
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {order.is_paid ? 'Payé' : order.status === 'pending' ? 'En attente' : 'Annulé'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
