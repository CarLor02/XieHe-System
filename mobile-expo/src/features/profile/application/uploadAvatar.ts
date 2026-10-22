import type { XieheApiSdk } from '@xiehe/api-sdk';
import type { HttpClient } from '@xiehe/api-client';
import { runMultipartUpload } from '@xiehe/upload-core';
import type { AvatarFile } from './ports';

export async function uploadAvatar(
  auth: Pick<
    XieheApiSdk['auth'],
    'createAvatarUploadSession' | 'completeAvatarUpload' | 'getSessionUser'
  >,
  storage: Pick<HttpClient, 'requestWithMetadata'>,
  file: AvatarFile
) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimeType))
    throw new Error('头像支持 PNG、JPEG 和 WebP');
  if (file.size <= 0 || file.size > 5 * 1024 * 1024)
    throw new Error('请选择 5 MB 以内的头像');
  const session = await auth.createAvatarUploadSession({
    filename: file.name,
    size: file.size,
    mime_type: file.mimeType,
  });
  if (
    session.part_size <= 0 ||
    session.parts.length !== Math.ceil(file.size / session.part_size)
  )
    throw new Error('头像上传分片信息不完整');
  const parts = await runMultipartUpload({
    totalBytes: file.size,
    concurrency: 2,
    parts: session.parts.map(part => ({
      partNumber: part.part_number,
      start: (part.part_number - 1) * session.part_size,
      end: Math.min(part.part_number * session.part_size, file.size),
      size: Math.min(
        session.part_size,
        file.size - (part.part_number - 1) * session.part_size
      ),
      url: part.url,
    })),
    async uploadPart(part, context) {
      const bytes = await file.readChunk(part.start, part.end);
      if (bytes.byteLength !== part.size) throw new Error('头像读取不完整');
      const response = await storage.requestWithMetadata({
        method: 'PUT',
        url: part.url,
        data: bytes,
        auth: 'none',
        responseMode: 'raw',
        signal: context.signal,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      const etag = response.headers.etag;
      if (!etag) throw new Error('对象存储未返回头像分片 ETag');
      return etag.replace(/^"|"$/g, '');
    },
  });
  await auth.completeAvatarUpload({
    upload_id: session.upload_id,
    parts: parts.map(part => ({
      part_number: part.partNumber,
      etag: part.etag,
    })),
  });
  return auth.getSessionUser();
}
