import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeCurrency } from '@/lib/currency';

export interface ProviderProfile {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  is_admin: boolean;
  avatar_url?: string | null;
  country?: string | null;
}

interface ProviderContextType {
  profile: ProviderProfile | null;
  loading: boolean;
  verified: boolean;
  currency: string;
  refreshProfile: () => Promise<void>;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

let cachedProfile: ProviderProfile | null = null;
let cachedVerified = false;

export const ProviderProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedVerified);
  const [verified, setVerified] = useState(cachedVerified);

  const loadProfile = useCallback(async () => {
    if (!user) {
      cachedProfile = null;
      cachedVerified = false;
      setProfile(null);
      setVerified(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, currency, is_admin, avatar_url, country, subscription_type, subscription_status')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      navigate('/auth/signin');
      setLoading(false);
      return;
    }

    if (data.is_admin) {
      navigate('/admin');
      setLoading(false);
      return;
    }

    if (!data.subscription_type) {
      await supabase.rpc('subscribe_to_plan', {
        plan_name_param: 'basic',
        payment_method_param: 'free',
      });
    }

    const providerProfile: ProviderProfile = {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      currency: normalizeCurrency(data.currency),
      is_admin: data.is_admin ?? false,
      avatar_url: data.avatar_url,
      country: data.country,
    };

    cachedProfile = providerProfile;
    cachedVerified = true;
    setProfile(providerProfile);
    setVerified(true);
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      cachedProfile = null;
      cachedVerified = false;
      setProfile(null);
      setVerified(false);
      setLoading(false);
      return;
    }
    if (cachedVerified && cachedProfile?.id === user.id) {
      setProfile(cachedProfile);
      setVerified(true);
      setLoading(false);
      return;
    }
    loadProfile();
  }, [user, authLoading, loadProfile]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`provider-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          const next: ProviderProfile = {
            id: user.id,
            email: (updated.email as string) ?? profile?.email ?? '',
            full_name: (updated.full_name as string | null) ?? null,
            currency: normalizeCurrency(updated.currency as string),
            is_admin: (updated.is_admin as boolean) ?? false,
            avatar_url: (updated.avatar_url as string | null) ?? null,
            country: (updated.country as string | null) ?? null,
          };
          cachedProfile = next;
          setProfile(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.email]);

  const refreshProfile = useCallback(async () => {
    cachedVerified = false;
    await loadProfile();
  }, [loadProfile]);

  return (
    <ProviderContext.Provider
      value={{
        profile,
        loading,
        verified,
        currency: profile?.currency ?? 'FCFA',
        refreshProfile,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
};

export const useProvider = () => {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }
  return context;
};

export const clearProviderCache = () => {
  cachedProfile = null;
  cachedVerified = false;
};
