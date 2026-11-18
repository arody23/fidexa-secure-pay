import { useMemo, useState } from 'react';
import { AlertCircle, CircleDollarSign, Clock, Receipt } from 'lucide-react';
import { useProvider } from '@/contexts/ProviderContext';
import { useProviderPaymentLinks } from '@/hooks/useProviderPaymentLinks';
import { formatAmount, convertAmount } from '@/lib/currency';
import { escrowStatusLabel, isActivelyInEscrow } from '@/lib/escrowConfig';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  link_id: string;
  client_name: string;
  amount: number;
  currency?: string;
  net_amount?: number;
  escrow_released?: boolean;
  refunded?: boolean;
  order_status?: string;
  status: string;
  is_paid: boolean;
  created_at: string;
}

export default function Transactions() {
  const { currency } = useProvider();
  const { data: rawLinks, loading } = useProviderPaymentLinks();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');

  const transactions = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[]).map((link) => ({
        id: link.id as string,
        link_id: link.link_id as string,
        client_name: (link.client_name as string) || 'Client',
        amount: (link.amount as number) || 0,
        currency: (link.currency as string) || undefined,
        net_amount: link.net_amount as number | undefined,
        escrow_released: link.escrow_released as boolean | undefined,
        refunded: Boolean(link.refunded),
        order_status: link.order_status as string | undefined,
        status: (link.status as string) || 'pending',
        is_paid: Boolean(link.is_paid),
        created_at: link.created_at as string,
      })) as Transaction[],
    [rawLinks]
  );

  const filteredTransactions = useMemo(() => {
    if (filterStatus === 'paid') return transactions.filter((t) => t.is_paid);
    if (filterStatus === 'pending') {
      return transactions.filter((t) => !t.is_paid && t.status !== 'cancelled');
    }
    return transactions;
  }, [transactions, filterStatus]);

  const releasedTransactions = transactions.filter(
    (t) => t.is_paid && t.escrow_released === true
  );
  const escrowTransactions = transactions.filter((t) => isActivelyInEscrow(t));
  const totalRevenue = releasedTransactions.reduce(
    (sum, t) =>
      sum + convertAmount(t.net_amount || t.amount, t.currency || currency, currency),
    0
  );
  const escrowHeld = escrowTransactions.reduce(
    (sum, t) => sum + convertAmount(t.amount, t.currency || currency, currency),
    0
  );
  const paidCount = transactions.filter((t) => t.is_paid && !t.refunded).length;
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
        Transactions
      </h1>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <CircleDollarSign className="h-4 w-4 text-[#0b3b78]" strokeWidth={1.75} />
          <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-[#0b2f63]">
            {formatAmount(totalRevenue, currency)}
          </p>
          <p className="mt-1 text-[11px] text-[#8a9bb0]">Revenu net</p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <Clock className="h-4 w-4 text-[#b8860b]" strokeWidth={1.75} />
          <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-[#0b2f63]">
            {formatAmount(escrowHeld, currency)}
          </p>
          <p className="mt-1 text-[11px] text-[#8a9bb0]">Escrow actif</p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <Clock className="h-4 w-4 text-[#8a9bb0]" strokeWidth={1.75} />
          <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-[#0b2f63]">
            {pendingCount}
          </p>
          <p className="mt-1 text-[11px] text-[#8a9bb0]">En attente</p>
        </div>
        <div className="rounded-xl border border-[#e2eaf3] bg-white p-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <Receipt className="h-4 w-4 text-[#178c52]" strokeWidth={1.75} />
          <p className="mt-2 text-lg font-semibold tabular-nums leading-none text-[#0b2f63]">
            {paidCount}
          </p>
          <p className="mt-1 text-[11px] text-[#8a9bb0]">Payées</p>
        </div>
      </section>

      <div className="flex gap-1 rounded-full bg-[#e8eef6] p-1">
        {([
          { id: 'all', label: 'Toutes' },
          { id: 'paid', label: 'Payées' },
          { id: 'pending', label: 'Attente' },
        ] as const).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterStatus(f.id)}
            className={cn(
              'flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors',
              filterStatus === f.id
                ? 'bg-white text-[#0b3b78] shadow-sm'
                : 'text-[#5c7188]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-[#e2eaf3] bg-white py-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-[#c5d0de]" />
          <p className="text-sm text-[#8a9bb0]">Aucune transaction</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="divide-y divide-[#eef3f9]">
            {filteredTransactions.map((t) => {
              const label = escrowStatusLabel(t);
              return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0 leading-none">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#0b2f63]">{t.client_name}</p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        label === 'Libéré' && 'bg-[#edf9f2] text-[#178c52]',
                        label === 'Escrow' && 'bg-[#eef4fb] text-[#0b3b78]',
                        label === 'Litige' && 'bg-[#fff4e5] text-[#b86e00]',
                        (label === 'Remboursé' || label === 'Annulé') &&
                          'bg-[#fef2f2] text-[#b91c1c]',
                        label === 'Ouvert' && 'bg-[#f1f5f9] text-[#64748b]'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8a9bb0]">
                    {new Date(t.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[#0b2f63]">
                  {formatAmount(
                    convertAmount(t.amount, t.currency || currency, currency),
                    currency
                  )}
                </p>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
