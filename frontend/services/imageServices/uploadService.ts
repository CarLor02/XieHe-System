import { apiClient } from '@/lib/api';
import {
  extractData,
  extractPaginatedData,
  PaginatedResult,
} from '@/lib/api/types';

export interface UploadSingleRequest {
  file: File;
  patient_id?: string | null;
  description?: string | null;
  team_ids?: number[];
}

export interface UploadPartUrl {
  part_number: number;
  url: string;
}

export interface UploadSession {
  image_file_id: number;
  file_uuid: string;
  storage_bucket: string;
  object_key: string;
  upload_id: string;
  part_size: number;
  expires_in: number;
  parts: UploadPartUrl[];
}

export interface CompletedUploadPart {
  part_number: number;
  etag: string;
}

export interface UploadSingleResponse {
  image_file_id: number;
  file_id: string;
  file_uuid: string;
  filename: string;
  size?: number;
  mime_type?: string;
  status?: string;
}

export interface UploadStatusRecord {
  image_file_id?: number;
  file_uuid?: string;
  status?: string;
  upload_progress?: number;
  progress?: number;
  message?: string;
}

export interface UploadRecord {
  id: number | string;
  file_id?: string | number;
  filename?: string;
  status?: string;
  created_at?: string;
}

export async function createImageUploadSession(payload: {
  filename: string;
  size: number;
  mime_type: string;
  patient_id?: number | null;
  description?: string | null;
  team_ids?: number[];
}): Promise<UploadSession> {
  const response = await apiClient.post('/api/v1/upload/sessions', payload);
  return extractData<UploadSession>(response);
}

export async function completeImageUploadSession(
  imageFileId: number,
  payload: { upload_id: string; parts: CompletedUploadPart[]; file_hash?: string | null }
): Promise<UploadStatusRecord> {
  const response = await apiClient.post(
    `/api/v1/upload/sessions/${imageFileId}/complete`,
    payload
  );
  return extractData<UploadStatusRecord>(response);
}

async function uploadPart(url: string, blob: Blob): Promise<string> {
  const response = await apiClient.put(url, blob, {
    headers: { 'Content-Type': 'application/octet-stream' },
    transformRequest: [(data: Blob) => data],
    _skipAuthRefresh: true,
  } as any);
  const etag = response.headers?.etag || response.headers?.ETag;
  if (!etag) {
    throw new Error('对象存储未返回 ETag');
  }
  return etag.replace(/^"|"$/g, '');
}

export async function uploadSingleFile(
  payload: UploadSingleRequest
): Promise<UploadSingleResponse> {
  const file = payload.file;
  const session = await createImageUploadSession({
    filename: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
    patient_id: payload.patient_id ? Number(payload.patient_id) : null,
    description: payload.description || null,
    team_ids: payload.team_ids || [],
  });

  const completedParts: CompletedUploadPart[] = [];
  for (const part of session.parts) {
    const start = (part.part_number - 1) * session.part_size;
    const end = Math.min(start + session.part_size, file.size);
    const etag = await uploadPart(part.url, file.slice(start, end));
    completedParts.push({ part_number: part.part_number, etag });
  }

  const status = await completeImageUploadSession(session.image_file_id, {
    upload_id: session.upload_id,
    parts: completedParts,
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
  const response = await apiClient.get(`/api/v1/upload/status/${imageFileId}`);
  const data = extractData<UploadStatusRecord>(response);
  return {
    ...data,
    progress: data.upload_progress,
  };
}

export async function getUploadRecords(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResult<UploadRecord>> {
  const response = await apiClient.get('/api/v1/upload/records', { params });
  return extractPaginatedData<UploadRecord>(response);
}
