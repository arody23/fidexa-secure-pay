import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { useProvider } from '@/contexts/ProviderContext';
import { useProviderPaymentLinks } from '@/hooks/useProviderPaymentLinks';
import { formatAmount } from '@/lib/currency';

interface Transaction {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  net_amount?: number;
  escrow_released?: boolean;
  status: string;
  is_paid: boolean;
  created_at: string;
}

export default function Transactions() {
  const { currency } = useProvider();
  const { data: rawLinks, loading } = useProviderPaymentLinks();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');

  const transactions = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || 'Client',
        client_email: (link.client_email as string) || 'N/A',
        amount: (link.amount as number) || 0,
        net_amount: link.net_amount as number | undefined,
        escrow_released: link.escrow_released as boolean | undefined,
        status: (link.status as string) || 'pending',
        is_paid: Boolean(link.is_paid),
        created_at: link.created_at as string,
      })) as Transaction[],
    [rawLinks]
  );

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.link_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.client_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'paid') {
      filtered = filtered.filter((t) => t.is_paid);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter((t) => !t.is_paid && t.status !== 'cancelled');
    } else if (filterStatus === 'cancelled') {
      filtered = filtered.filter((t) => t.status === 'cancelled');
    }

    return filtered;
  }, [transactions, searchTerm, filterStatus]);

  const releasedTransactions = transactions.filter(
    (t) => t.is_paid && t.escrow_released === true
  );
  const totalRevenue = releasedTransactions.reduce(
    (sum, t) => sum + (t.net_amount || t.amount),
    0
  );
  const paidCount = transactions.filter((t) => t.is_paid).length;
  const pendingCount = transactions.filter(
    (t) => !t.is_paid && t.status !== 'cancelled'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Transactions</h1>
        <p className="mt-1 text-muted-foreground">Historique de vos transactions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatAmount(totalRevenue, currency)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paidCount} transactions payées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pendingCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Transactions non payées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{transactions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Toutes les transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste des transactions</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:w-64"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'paid', 'pending'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'Toutes' : status === 'paid' ? 'Payées' : 'En attente'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="font-semibold">{transaction.client_name}</h3>
                      <Badge variant={transaction.is_paid ? 'default' : 'secondary'}>
                        {transaction.is_paid ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{transaction.client_email}</span>
                      <span>·</span>
                      <span>ID: {transaction.link_id.slice(0, 8)}</span>
                      <span>·</span>
                      <span>
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-semibold">
                    {formatAmount(transaction.amount, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
