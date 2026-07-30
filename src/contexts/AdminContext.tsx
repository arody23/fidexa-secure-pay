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

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_admin: boolean;
}

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
  user: AdminUser | null;
  refreshAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

let cachedAdminUser: AdminUser | null = null;
let cachedIsAdmin = false;

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(cachedAdminUser);
  const [isAdmin, setIsAdmin] = useState(cachedIsAdmin);
  const [loading, setLoading] = useState(!cachedIsAdmin);

  const verifyAdmin = useCallback(async () => {
    if (!authUser) {
      cachedAdminUser = null;
      cachedIsAdmin = false;
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      navigate('/auth/signin');
      return;
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, role, is_admin, full_name, email')
      .eq('id', authUser.id)
      .single();

    if (error || !userData) {
      cachedAdminUser = null;
      cachedIsAdmin = false;
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    const isAdminFromJWT = authUser.user_metadata?.is_admin === true;
    const shouldBeAdmin =
      isAdminFromJWT ||
      userData.is_admin === true ||
      userData.role === 'admin';

    if (!shouldBeAdmin) {
      cachedAdminUser = null;
      cachedIsAdmin = false;
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    const adminUser: AdminUser = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_admin: true,
    };

    cachedAdminUser = adminUser;
    cachedIsAdmin = true;
    setUser(adminUser);
    setIsAdmin(true);
    setLoading(false);
  }, [authUser, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      cachedAdminUser = null;
      cachedIsAdmin = false;
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (cachedIsAdmin && cachedAdminUser?.id === authUser.id) {
      setUser(cachedAdminUser);
      setIsAdmin(true);
      setLoading(false);
      return;
    }
    verifyAdmin();
  }, [authUser, authLoading, verifyAdmin]);

  const refreshAdmin = useCallback(async () => {
    cachedIsAdmin = false;
    await verifyAdmin();
  }, [verifyAdmin]);

  return (
    <AdminContext.Provider value={{ isAdmin, loading, user, refreshAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
};

export const clearAdminCache = () => {
  cachedAdminUser = null;
  cachedIsAdmin = false;
};
