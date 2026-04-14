import { apiClient } from '@/lib/api';
import { extractPaginatedData } from '@/lib/api/types';
import { PermissionRole, RoleListResult } from './types';

export async function getPermissionRoles(filters: {
  status?: string;
  is_system?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<RoleListResult> {
  const response = await apiClient.get('/api/v1/permissions/roles', {
    params: filters,
  });
  return extractPaginatedData<PermissionRole>(response);
}
