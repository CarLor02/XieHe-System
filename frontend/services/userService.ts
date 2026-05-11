/**
 * 用户服务
 * 提供用户信息相关的 API 调用
 */

import { apiClient } from '@/lib/api';
import { extractData, isSuccessResponse } from '@/lib/api/types';

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
  avatar_url?: string | null;
  avatar_storage_bucket?: string | null;
  avatar_object_key?: string | null;
}

export interface UserUpdateData {
  phone?: string;
  real_name?: string;
  department_id?: number;
  position?: string;
  title?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AvatarUploadPartUrl {
  part_number: number;
  url: string;
}

export interface AvatarUploadSession {
  storage_bucket: string;
  object_key: string;
  upload_id: string;
  part_size: number;
  expires_in: number;
  parts: AvatarUploadPartUrl[];
}

type ApiRequestConfigWithAuthBypass = NonNullable<
  Parameters<typeof apiClient.put>[2]
> & {
  _skipAuthRefresh?: boolean;
};

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const response = await apiClient.get('/api/v1/auth/me');

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
  const response = await apiClient.put('/api/v1/auth/me', data);

  // 检查是否是错误响应
  if (!isSuccessResponse(response)) {
    throw new Error(response.data?.message || '更新用户信息失败');
  }

  return extractData<UserInfo>(response);
}

export async function changeCurrentUserPassword(
  data: PasswordChangeData
): Promise<void> {
  const response = await apiClient.post('/api/v1/auth/password/change', data);

  if (!isSuccessResponse(response)) {
    throw new Error(response.data?.message || '修改密码失败');
  }
}

export async function createAvatarUploadSession(file: File): Promise<AvatarUploadSession> {
  const response = await apiClient.post('/api/v1/auth/me/avatar/upload-session', {
    filename: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
  });
  return extractData<AvatarUploadSession>(response);
}

export async function uploadCurrentUserAvatar(file: File): Promise<UserInfo> {
  const session = await createAvatarUploadSession(file);
  const parts = [];
  for (const part of session.parts) {
    const start = (part.part_number - 1) * session.part_size;
    const end = Math.min(start + session.part_size, file.size);
    const uploadConfig: ApiRequestConfigWithAuthBypass = {
      headers: { 'Content-Type': 'application/octet-stream' },
      transformRequest: [(data: Blob) => data],
      _skipAuthRefresh: true,
    };
    const uploadResponse = await apiClient.put(
      part.url,
      file.slice(start, end),
      uploadConfig
    );
    const etag = uploadResponse.headers?.etag || uploadResponse.headers?.ETag;
    if (!etag) {
      throw new Error('对象存储未返回头像分片 ETag');
    }
    parts.push({
      part_number: part.part_number,
      etag: etag.replace(/^"|"$/g, ''),
    });
  }

  const response = await apiClient.post('/api/v1/auth/me/avatar/complete', {
    upload_id: session.upload_id,
    parts,
  });
  return extractData<UserInfo>(response);
}

export async function deleteCurrentUserAvatar(): Promise<UserInfo> {
  const response = await apiClient.delete('/api/v1/auth/me/avatar');
  return extractData<UserInfo>(response);
}
