import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { UserPermissionDetail } from './types';

export async function getUserPermissionDetail(
  userId: number | string
): Promise<UserPermissionDetail> {
  const response = await apiClient.get(
    `/api/v1/permissions/users/${userId}/permissions`
  );
  return extractData<UserPermissionDetail>(response);
}
