/**
 * 用户服务
 * 提供用户信息相关的 API 调用
 */

import { createAuthenticatedClient } from '@/store/authStore';
import { extractData, isSuccessResponse } from '@/utils/apiResponseHandler';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  real_name?: string;
  employee_id?: string;
  department?: string;
  department_id?: number;
  position?: string;
  title?: string;
  is_active: boolean;
  roles: string[];
  is_system_admin: boolean;
  system_admin_level: number;
}

export interface UserUpdateData {
  phone?: string;
  real_name?: string;
  department_id?: number;
  position?: string;
  title?: string;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const client = createAuthenticatedClient();
  const response = await client.get('/api/v1/auth/me');

  // 检查是否是错误响应
  if (!isSuccessResponse(response)) {
    throw new Error(response.data?.message || '获取用户信息失败');
  }

  return extractData<UserInfo>(response);
}

/**
 * 更新当前用户信息
 */
export async function updateCurrentUser(data: UserUpdateData): Promise<UserInfo> {
  const client = createAuthenticatedClient();
  const response = await client.put('/api/v1/auth/me', data);

  // 检查是否是错误响应
  if (!isSuccessResponse(response)) {
    throw new Error(response.data?.message || '更新用户信息失败');
  }

  return extractData<UserInfo>(response);
}

