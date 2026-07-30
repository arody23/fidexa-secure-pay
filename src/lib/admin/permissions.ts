export type AdminPermission = 
  | 'view_dashboard'
  | 'manage_transactions'
  | 'manage_disputes'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_settings'
  | 'view_payments';

export type AdminRole = 'super_admin' | 'moderator' | 'analyst';

export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'view_dashboard',
    'manage_transactions',
    'manage_disputes',
    'manage_users',
    'view_analytics',
    'manage_settings',
    'view_payments',
  ],
  moderator: [
    'view_dashboard',
    'manage_disputes',
    'manage_transactions',
    'view_analytics',
  ],
  analyst: [
    'view_dashboard',
    'view_analytics',
  ],
};

export function hasPermission(
  adminRole: AdminRole,
  permission: AdminPermission
): boolean {
  return rolePermissions[adminRole]?.includes(permission) || false;
}

export function checkPermission(
  adminRole: AdminRole,
  permissions: AdminPermission[]
): boolean {
  return permissions.some(p => hasPermission(adminRole, p));
}
