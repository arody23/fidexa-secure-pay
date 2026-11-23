import { Outlet, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { ProviderProvider, useProvider } from '@/contexts/ProviderContext';
import { useAuth } from '@/contexts/AuthContext';

function DashboardSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-4" aria-label="Chargement du tableau de bord">
        <div className="h-5 w-36 animate-pulse rounded-full bg-[#dbe6f2]" />
        <div className="h-8 w-52 animate-pulse rounded-full bg-[#dbe6f2]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl bg-[#dbe6f2]" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ProviderGate() {
  const { user, loading: authLoading } = useAuth();
  const { loading, verified } = useProvider();

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (!verified) {
    if (loading) return <DashboardSkeleton />;
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
