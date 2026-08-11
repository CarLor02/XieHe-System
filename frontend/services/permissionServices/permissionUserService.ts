import { apiSdk } from '@/infrastructure/http';
import type { UserPermissionDetail } from './types';

export async function getUserPermissionDetail(
  userId: number | string
): Promise<UserPermissionDetail> {
  return apiSdk.permissions.getUser(String(userId));
}
