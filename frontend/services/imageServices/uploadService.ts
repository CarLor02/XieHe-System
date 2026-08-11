import { apiSdk, objectStorageClient } from '@/infrastructure/http';
import type {
  BatchCreateUploadFile,
  CompleteUploadRequest,
  CompletedUploadPart,
  CreatedImageImportBatch,
  ImageImportConfig,
  ImageImportItem,
  ImageImportUploadSession,
  UploadSession,
  UploadSingleResponse,
  UploadStatusRecord,
} from '@xiehe/api-contracts';

export type {
  BatchCreateUploadFile,
  CompletedUploadPart,
  CreatedImageImportBatch,
  ImageImportBatch,
  ImageImportConfig,
  ImageImportItem,
  ImageImportUploadSession,
  UploadPartUrl,
  UploadRecord,
  UploadSession,
  UploadSingleResponse,
  UploadStatusRecord,
} from '@xiehe/api-contracts';

export interface UploadSingleRequest {
  file: File;
  patient_id?: string | null;
  description?: string | null;
  team_ids?: number[];
}

export function createImageUploadSession(payload: {
  filename: string;
  size: number;
  mime_type: string;
  patient_id?: number | null;
  description?: string | null;
  team_ids?: number[];
}): Promise<UploadSession> {
  return apiSdk.upload.createSession(payload);
}

export function completeImageUploadSession(
  imageFileId: number,
  payload: CompleteUploadRequest
): Promise<UploadStatusRecord> {
  return apiSdk.upload.completeSession(imageFileId, payload);
}

export async function uploadObjectPart(
  url: string,
  blob: Blob
): Promise<string> {
  const response = await objectStorageClient.requestWithMetadata<string, Blob>({
    method: 'PUT',
    url,
    data: blob,
    auth: 'none',
    responseMode: 'raw',
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  const etag = response.headers.etag;
  if (!etag) throw new Error('对象存储未返回 ETag');
  return etag.replace(/^"|"$/g, '');
}

export function getImageImportConfig(): Promise<ImageImportConfig> {
  return apiSdk.upload.getImportConfig();
}

export function createImageImportBatch(payload: {
  patient_id: number;
  description?: string | null;
  team_ids?: number[];
  files: BatchCreateUploadFile[];
}): Promise<CreatedImageImportBatch> {
  return apiSdk.upload.createImportBatch(payload);
}

export async function createImageImportSessions(
  batchId: string,
  itemIds: number[]
): Promise<{ items: ImageImportUploadSession[] }> {
  return apiSdk.upload.createImportSessions(batchId, itemIds);
}

export function completeImageImportItem(
  batchId: string,
  itemId: number,
  payload: CompleteUploadRequest
): Promise<ImageImportItem> {
  return apiSdk.upload.completeImportItem(batchId, itemId, payload);
}

export function markImageImportUploadFailed(
  batchId: string,
  itemId: number,
  error: string
): Promise<ImageImportItem> {
  return apiSdk.upload.markImportUploadFailed(batchId, itemId, error);
}

export function enqueueImageImportItem(
  batchId: string,
  itemId: number
): Promise<ImageImportItem> {
  return apiSdk.upload.enqueueImportItem(batchId, itemId);
}

export function getImageImportBatches(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}) {
  return apiSdk.upload.listImportBatches(params);
}

export function getImageImportItems(
  batchId: string,
  params?: { page?: number; page_size?: number }
) {
  return apiSdk.upload.listImportItems(batchId, params);
}

export async function uploadSingleFile(
  payload: UploadSingleRequest
): Promise<UploadSingleResponse> {
  const { file } = payload;
  const session = await createImageUploadSession({
    filename: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
    patient_id: payload.patient_id ? Number(payload.patient_id) : null,
    description: payload.description || null,
    team_ids: payload.team_ids || [],
  });
  const parts: CompletedUploadPart[] = [];
  for (const part of session.parts) {
    const start = (part.part_number - 1) * session.part_size;
    const end = Math.min(start + session.part_size, file.size);
    parts.push({
      part_number: part.part_number,
      etag: await uploadObjectPart(part.url, file.slice(start, end)),
    });
  }
  const status = await completeImageUploadSession(session.image_file_id, {
    upload_id: session.upload_id,
    parts,
  });
  return {
    image_file_id: session.image_file_id,
    file_id: String(session.image_file_id),
    file_uuid: session.file_uuid,
    filename: file.name,
    size: file.size,
    mime_type: file.type,
    status: status.status,
  };
}

export async function uploadFileChunk(): Promise<Record<string, unknown>> {
  throw new Error('分片上传接口已废弃，请使用对象存储上传会话');
}

export async function completeChunkUpload(): Promise<UploadSingleResponse> {
  throw new Error('分片上传接口已废弃，请使用对象存储上传会话');
}

export async function getUploadStatus(
  imageFileId: string | number
): Promise<UploadStatusRecord> {
  const data = await apiSdk.upload.getStatus(imageFileId);
  return { ...data, progress: data.upload_progress };
}

export function getUploadRecords(params?: {
  page?: number;
  page_size?: number;
}): ReturnType<typeof apiSdk.upload.listRecords> {
  return apiSdk.upload.listRecords(params);
}
