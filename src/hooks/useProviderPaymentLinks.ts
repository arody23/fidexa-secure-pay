import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvider } from '@/contexts/ProviderContext';

export function useProviderPaymentLinks<T = Record<string, unknown>>() {
  const { profile } = useProvider();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
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

    setData((rows ?? []) as T[]);
    setError(null);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    setLoading(true);
    fetchData();

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
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
