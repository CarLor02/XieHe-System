import { apiClient } from '@/infrastructure/http';
import { UserPermissionDetail } from './types';

export async function getUserPermissionDetail(
  userId: number | string
): Promise<UserPermissionDetail> {
  return apiClient.get<UserPermissionDetail>(
    `/api/v1/permissions/users/${userId}/permissions`
  );
}
