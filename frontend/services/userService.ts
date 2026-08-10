/**
 * 用户服务
 * 提供用户信息相关的 API 调用
 */

import { apiClient, objectStorageClient } from '@/infrastructure/http';

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

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  return apiClient.get<UserInfo>('/api/v1/auth/me');
}

/**
 * 更新当前用户信息
 */
export async function updateCurrentUser(
  data: UserUpdateData
): Promise<UserInfo> {
  return apiClient.put<UserInfo, UserUpdateData>('/api/v1/auth/me', data);
}

export async function changeCurrentUserPassword(
  data: PasswordChangeData
): Promise<void> {
  await apiClient.post<void, PasswordChangeData>(
    '/api/v1/auth/password/change',
    data
  );
}

export async function createAvatarUploadSession(
  file: File
): Promise<AvatarUploadSession> {
  return apiClient.post<AvatarUploadSession>(
    '/api/v1/auth/me/avatar/upload-session',
    {
      filename: file.name,
      size: file.size,
      mime_type: file.type || 'application/octet-stream',
    }
  );
}

export async function uploadCurrentUserAvatar(file: File): Promise<UserInfo> {
  const session = await createAvatarUploadSession(file);
  const parts = [];
  for (const part of session.parts) {
    const start = (part.part_number - 1) * session.part_size;
    const end = Math.min(start + session.part_size, file.size);
    const uploadResponse = await objectStorageClient.requestWithMetadata<
      string,
      Blob
    >({
      method: 'PUT',
      url: part.url,
      data: file.slice(start, end),
      auth: 'none',
      responseMode: 'raw',
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const etag = uploadResponse.headers.etag;
    if (!etag) {
      throw new Error('对象存储未返回头像分片 ETag');
    }
    parts.push({
      part_number: part.part_number,
      etag: etag.replace(/^"|"$/g, ''),
    });
  }

  return apiClient.post<UserInfo>('/api/v1/auth/me/avatar/complete', {
    upload_id: session.upload_id,
    parts,
  });
}

export async function deleteCurrentUserAvatar(): Promise<UserInfo> {
  return apiClient.delete<UserInfo>('/api/v1/auth/me/avatar');
}
