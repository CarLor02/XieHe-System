import { apiClient, normalizeLegacyPagination } from '@/infrastructure/http';
import { PermissionRole, RoleListResult } from './types';

export async function getPermissionRoles(
  filters: {
    status?: string;
    is_system?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}
): Promise<RoleListResult> {
  const data = await apiClient.get<unknown>('/api/v1/permissions/roles', {
    params: filters,
  });
  return normalizeLegacyPagination<PermissionRole>(data);
}
