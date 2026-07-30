import { useAdminContext } from '@/contexts/AdminContext';

export function useAdmin() {
  return useAdminContext();
}
