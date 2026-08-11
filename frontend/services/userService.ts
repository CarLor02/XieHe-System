/**
 * 用户服务
 * 提供用户信息相关的 API 调用
 */

import { apiSdk, objectStorageClient } from '@/infrastructure/http';
import type {
  AvatarUploadSession,
  PasswordChangeRequest,
  UserInfo,
  UserUpdateRequest,
} from '@xiehe/api-contracts';

export type {
  AvatarUploadPartUrl,
  AvatarUploadSession,
  UserInfo,
} from '@xiehe/api-contracts';
export type UserUpdateData = UserUpdateRequest;
export type PasswordChangeData = PasswordChangeRequest;

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  return apiSdk.auth.getCurrentUser();
}

/**
 * 更新当前用户信息
 */
export async function updateCurrentUser(
  data: UserUpdateData
): Promise<UserInfo> {
  return apiSdk.auth.updateCurrentUser(data);
}

export async function changeCurrentUserPassword(
  data: PasswordChangeData
): Promise<void> {
  await apiSdk.auth.changePassword(data);
}

export async function createAvatarUploadSession(
  file: File
): Promise<AvatarUploadSession> {
  return apiSdk.auth.createAvatarUploadSession({
    filename: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
  });
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

  return apiSdk.auth.completeAvatarUpload({
    upload_id: session.upload_id,
    parts,
  });
}

export async function deleteCurrentUserAvatar(): Promise<UserInfo> {
  return apiSdk.auth.deleteAvatar();
}
