import { Outlet, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { ProviderProvider, useProvider } from '@/contexts/ProviderContext';
import { useAuth } from '@/contexts/AuthContext';

function ProviderGate() {
  const { user, loading: authLoading } = useAuth();
  const { loading, verified } = useProvider();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (!verified) {
    return <Navigate to="/auth/signin" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export default function ProviderRoute() {
  return (
    <ProviderProvider>
      <ProviderGate />
    </ProviderProvider>
  );
}
