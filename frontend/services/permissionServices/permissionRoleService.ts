import { apiSdk } from '@/infrastructure/http';
import type { RoleListResult } from './types';

export async function getPermissionRoles(
  filters: {
    status?: string;
    is_system?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}
): Promise<RoleListResult> {
  return apiSdk.permissions.listRoles(filters);
}
