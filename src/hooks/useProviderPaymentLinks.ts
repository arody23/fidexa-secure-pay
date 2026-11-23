import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvider } from '@/contexts/ProviderContext';

const paymentLinksCache = new Map<string, Record<string, unknown>[]>();

export function useProviderPaymentLinks<T = Record<string, unknown>>() {
  const { profile } = useProvider();
  const cachedRows = profile?.id ? paymentLinksCache.get(profile.id) : undefined;
  const [data, setData] = useState<T[]>((cachedRows as T[]) ?? []);
  const [loading, setLoading] = useState(!cachedRows);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    const { data: rows, error: fetchError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('provider_id', profile.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const nextRows = rows ?? [];
    paymentLinksCache.set(profile.id, nextRows as Record<string, unknown>[]);
    setData(nextRows as T[]);
    setError(null);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const cached = paymentLinksCache.get(profile.id);
    if (cached) {
      setData(cached as T[]);
      setLoading(false);
    }

    // Do not flip loading on realtime refresh — keep current data on screen
    void fetchData();

    const channel = supabase
      .channel(`payment-links-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_links',
          filter: `provider_id=eq.${profile.id}`,
        },
        () => {
          void fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
