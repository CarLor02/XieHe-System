import type { HttpClient } from '@xiehe/api-client';
import type { ImageUploadGateway } from '@/features/imaging/application/uploadPorts';
import { runMultipartUpload } from '@xiehe/upload-core';
import {
  validateUploadFile,
  type MobileUploadFile,
} from '@/features/imaging/domain/upload';

export async function uploadImage(input: {
  uploads: ImageUploadGateway;
  storage: Pick<HttpClient, 'requestWithMetadata'>;
  file: MobileUploadFile;
  patientId: number | null;
  examType: string;
  teamIds: number[];
  onProgress: (progress: number) => void;
}): Promise<number> {
  const { uploads, storage, file, onProgress } = input;
  validateUploadFile(file);
  const session = await uploads.createSession({
    filename: file.name,
    size: file.size,
    mime_type: file.mimeType,
    patient_id: input.patientId,
    description: input.examType,
    team_ids: input.teamIds,
  });
  if (
    session.part_size <= 0 ||
    session.parts.length !== Math.ceil(file.size / session.part_size)
  ) {
    throw new Error('上传会话的分片信息不完整，请重新上传');
  }
  const parts = await runMultipartUpload({
    parts: session.parts.map(part => {
      const start = (part.part_number - 1) * session.part_size;
      const end = Math.min(file.size, start + session.part_size);
      if (start < 0 || end <= start) throw new Error('上传会话包含无效分片');
      return {
        partNumber: part.part_number,
        size: end - start,
        start,
        end,
        url: part.url,
      };
    }),
    totalBytes: file.size,
    concurrency: 2,
    onProgress: progress =>
      onProgress(Math.min(99, Math.floor(progress.percentage))),
    async uploadPart(part, context) {
      const bytes = await file.readChunk(part.start, part.end);
      if (bytes.byteLength !== part.size)
        throw new Error('读取文件不完整，请重新选择文件');
      const response = await storage.requestWithMetadata<string, ArrayBuffer>({
        method: 'PUT',
        url: part.url,
        data: bytes,
        auth: 'none',
        responseMode: 'raw',
        signal: context.signal,
        timeout: 120_000,
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: progress => context.onProgress(progress.loaded),
      });
      const etag = response.headers.etag;
      if (!etag) throw new Error('对象存储未返回 ETag，无法确认上传');
      return etag.replace(/^"|"$/g, '');
    },
  });
  // Uploaded bytes are not a successful image until the API confirms the session.
  let result = await uploads.completeSession(session.session_id, {
    parts: parts.map(part => ({
      part_number: part.partNumber,
      etag: part.etag,
    })),
  });
  for (
    let attempt = 0;
    !result.image_file_id && !result.error && attempt < 20;
    attempt += 1
  ) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await uploads.getStatus(session.session_id);
  }
  if (result.error) throw new Error(result.error);
  if (!result.image_file_id)
    throw new Error(
      '文件已发送，服务端仍在处理，请稍后刷新影像列表，避免重复上传'
    );
  onProgress(100);
  return result.image_file_id;
}
