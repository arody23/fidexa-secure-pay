import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setExchangeRates } from '@/lib/currency';

export interface ExchangeRate {
  currency: string;
  units_per_usd: number;
  updated_at: string;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_exchange_rates' as never);
        if (rpcError) throw rpcError;

        const rows = (data as unknown as ExchangeRate[] | null) || [];
        if (!cancelled) {
          setRates(rows);
          setExchangeRates(Object.fromEntries(rows.map((r) => [r.currency, r.units_per_usd])));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur taux');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loading, error };
}
