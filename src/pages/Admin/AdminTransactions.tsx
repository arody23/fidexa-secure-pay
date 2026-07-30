import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, DollarSign, TrendingUp, Clock, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  convertToUSD,
  formatAmount,
  formatUSD,
  normalizeCurrency,
  commissionToUSD,
} from '@/lib/currency';

interface AdminTransaction {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  provider_name: string;
  escrow_released: boolean | null;
  status: string;
  is_paid: boolean;
  created_at: string;
  commission_amount: number | null;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel('admin-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_links' }, () => {
        loadTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data: links, error } = await supabase
        .from('payment_links')
        .select(
          'id, link_id, client_name, client_email, amount, provider_id, provider_name, escrow_released, status, is_paid, created_at, commission_amount'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const providerIds = [
        ...new Set((links || []).map((l) => l.provider_id).filter(Boolean)),
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

      setTransactions(
        (links || []).map((link) => ({
          id: link.id,
          link_id: link.link_id,
          client_name: link.client_name || 'Client',
          client_email: link.client_email || '—',
          amount: Number(link.amount) || 0,
          currency: (link.provider_id && currencyMap[link.provider_id]) || 'FCFA',
          provider_name: link.provider_name || '—',
          escrow_released: link.escrow_released,
          status: link.status || 'pending',
          is_paid: Boolean(link.is_paid),
          created_at: link.created_at,
          commission_amount: link.commission_amount,
        }))
      );
    } catch (err) {
      console.error('Error loading admin transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.link_id.toLowerCase().includes(q) ||
          t.client_name.toLowerCase().includes(q) ||
          t.client_email.toLowerCase().includes(q) ||
          t.provider_name.toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'paid') list = list.filter((t) => t.is_paid);
    else if (filterStatus === 'pending') list = list.filter((t) => !t.is_paid && t.status !== 'cancelled');
    else if (filterStatus === 'cancelled') list = list.filter((t) => t.status === 'cancelled');
    return list;
  }, [transactions, searchTerm, filterStatus]);

  const summary = useMemo(() => {
    const paid = transactions.filter((t) => t.is_paid);
    const totalUSD = paid.reduce((s, t) => s + convertToUSD(t.amount, t.currency), 0);
    const commissionsUSD = paid.reduce((s, t) => {
      const commission =
        t.commission_amount != null
          ? convertToUSD(t.commission_amount, t.currency)
          : commissionToUSD(t.amount, t.currency);
      return s + commission;
    }, 0);
    return {
      total: transactions.length,
      paidCount: paid.length,
      pendingCount: transactions.filter((t) => !t.is_paid && t.status !== 'cancelled').length,
      totalUSD,
      commissionsUSD,
    };
  }, [transactions]);

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
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-2 text-muted-foreground">
          Toutes les transactions plateforme — montants originaux + conversion USD
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Volume (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUSD(summary.totalUSD)}</p>
            <p className="text-xs text-muted-foreground">Transactions payées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commissions (USD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUSD(summary.commissionsUSD)}</p>
            <p className="text-xs text-muted-foreground">Total estimé</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payées</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summary.paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{summary.pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher client, prestataire, lien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'paid', 'pending', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'Toutes' : status === 'paid' ? 'Payées' : status === 'pending' ? 'En attente' : 'Annulées'}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Montant client</th>
                  <th className="px-4 py-3">Équivalent USD</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Aucune transaction trouvée
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.client_name}</p>
                        <p className="text-xs text-muted-foreground">{t.client_email}</p>
                      </td>
                      <td className="px-4 py-3">{t.provider_name}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(t.amount, t.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatUSD(convertToUSD(t.amount, t.currency))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            t.is_paid
                              ? 'bg-green-100 text-green-800'
                              : t.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {t.is_paid ? 'Payé' : t.status === 'cancelled' ? 'Annulé' : 'En attente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('fr-FR')}
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
