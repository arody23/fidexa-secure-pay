import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp } from '@/lib/native';
import Landing from '@/pages/Landing';

/**
 * Web keeps the marketing landing.
 * Android app is provider-only → sign-in or dashboard.
 */
export default function NativeHomeRedirect() {
  const { user, loading } = useAuth();

  if (!isNativeApp()) {
    return <Landing />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/auth/signin'} replace />;
}
