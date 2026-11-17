import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle } from 'lucide-react';
import { useProvider } from '@/contexts/ProviderContext';
import { useProviderPaymentLinks } from '@/hooks/useProviderPaymentLinks';
import { formatAmount, convertAmount } from '@/lib/currency';

interface Transaction {
  id: string;
  link_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency?: string;
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
        currency: (link.currency as string) || undefined,
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
    (sum, t) =>
      sum + convertAmount(t.net_amount || t.amount, t.currency || currency, currency),
    0
  );
  const paidCount = transactions.filter((t) => t.is_paid).length;
  const pendingCount = transactions.filter(
    (t) => !t.is_paid && t.status !== 'cancelled'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 overflow-x-hidden">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">
        Transactions
      </h1>

      <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <p className="text-[#5c7188]">Revenu total</p>
          <p className="text-lg font-semibold tabular-nums text-[#0b2f63]">
            {formatAmount(totalRevenue, currency)}
          </p>
        </div>
        <div>
          <p className="text-[#5c7188]">En attente</p>
          <p className="text-lg font-semibold tabular-nums text-[#0b2f63]">{pendingCount}</p>
        </div>
        <div>
          <p className="text-[#5c7188]">Total</p>
          <p className="text-lg font-semibold tabular-nums text-[#0b2f63]">
            {transactions.length}
            <span className="ml-1 text-xs font-normal text-[#5c7188]">({paidCount} payées)</span>
          </p>
        </div>
      </div>

      <div className="h-px bg-[#e4edf6]" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5c7188]" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'paid', 'pending'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                className={filterStatus === status ? 'bg-[#0b3b78] hover:bg-[#0a3266]' : ''}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'Toutes' : status === 'paid' ? 'Payées' : 'En attente'}
              </Button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#5c7188]/50" />
            <p className="text-[#5c7188]">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e4edf6]">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[#0b2f63]">{transaction.client_name}</h3>
                    <Badge variant={transaction.is_paid ? 'default' : 'secondary'}>
                      {transaction.is_paid ? 'Payé' : 'En attente'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#5c7188]">
                    <span>{transaction.client_email}</span>
                    <span>·</span>
                    <span>ID: {transaction.link_id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-right font-semibold tabular-nums text-[#0b2f63]">
                  {formatAmount(
                    convertAmount(
                      transaction.amount,
                      transaction.currency || currency,
                      currency
                    ),
                    currency
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}