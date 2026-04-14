import { PaginatedResult } from '@/lib/api/types';

export interface RolePermission {
  permission_id?: string;
  name: string;
  code: string;
  description?: string;
}

export interface PermissionRole {
  role_id: string;
  name: string;
  code: string;
  description?: string;
  permissions: RolePermission[];
  user_count: number;
  is_system: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface UserPermissionDetail {
  user_id: string;
  username: string;
  direct_permissions: RolePermission[];
  role_permissions: RolePermission[];
  group_permissions: RolePermission[];
  effective_permissions: RolePermission[];
  roles: PermissionRole[];
  groups: Array<{ group_id: string; name: string; description?: string }>;
  last_updated: string;
}

export type RoleListResult = PaginatedResult<PermissionRole>;
