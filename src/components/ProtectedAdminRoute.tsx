import { Outlet } from 'react-router-dom';
import { AdminProvider, useAdminContext } from '@/contexts/AdminContext';
import { Loader } from 'lucide-react';
import AdminLayout from '@/components/Admin/AdminLayout';

function AdminGate() {
  const { isAdmin, loading } = useAdminContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="text-center">
          <Loader className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export function ProtectedAdminRoute() {
  return (
    <AdminProvider>
      <AdminGate />
    </AdminProvider>
  );
}
