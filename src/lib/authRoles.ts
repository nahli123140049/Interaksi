export type AdminRole = 'super_admin' | 'admin_redaksi' | 'monitoring';

export const adminRoleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin_redaksi: 'Admin Redaksi',
  monitoring: 'Monitoring'
};

export const adminRoleDescriptions: Record<AdminRole, string> = {
  super_admin: 'Akses penuh untuk mengelola semua data dan pengguna.',
  admin_redaksi: 'Bisa membuat dan mengubah konten, tetapi tidak bisa menghapus laporan atau mengelola user.',
  monitoring: 'Hanya bisa melihat data dashboard tanpa aksi perubahan.'
};

export type RolePermissions = {
  canReadDashboard: boolean;
  canViewAuditLog: boolean;
  canEditReports: boolean;
  canCreateNews: boolean;
  canEditNews: boolean;
  canDeleteNews: boolean;
  canDeleteReports: boolean;
  canModerateContent: boolean;
  canManageUsers: boolean;
  canPublishContent: boolean;
};

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === 'super_admin' || value === 'admin_redaksi' || value === 'monitoring';
}

export function getRolePermissions(role: AdminRole | null): RolePermissions {
  if (role === 'super_admin') {
    return {
      canReadDashboard: true,
      canViewAuditLog: true,
      canEditReports: true,
      canCreateNews: true,
      canEditNews: true,
      canDeleteNews: true,
      canDeleteReports: true,
      canModerateContent: true,
      canManageUsers: true,
      canPublishContent: true
    };
  }

  if (role === 'admin_redaksi') {
    return {
      canReadDashboard: true,
      canViewAuditLog: false,
      canEditReports: true,
      canCreateNews: true,
      canEditNews: true,
      canDeleteNews: false,
      canDeleteReports: false,
      canModerateContent: true,
      canManageUsers: false,
      canPublishContent: true
    };
  }

  return {
    canReadDashboard: true,
    canViewAuditLog: false,
    canEditReports: false,
    canCreateNews: false,
    canEditNews: false,
    canDeleteNews: false,
    canDeleteReports: false,
    canModerateContent: false,
    canManageUsers: false,
    canPublishContent: false
  };
}
