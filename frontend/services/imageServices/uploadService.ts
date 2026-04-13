import { apiClient } from '@/lib/api';
import {
  extractData,
  extractPaginatedData,
  PaginatedResult,
} from '@/lib/api/types';

export interface UploadSingleRequest {
  file: File | Blob;
  patient_id?: string | null;
  description?: string | null;
}

export interface ChunkUploadRequest {
  file_id: string;
  chunk_index: number;
  total_chunks: number;
  chunk_hash: string;
  file_hash?: string | null;
}

export interface UploadSingleResponse {
  file_id: string;
  filename: string;
  size?: number;
  mime_type?: string;
  upload_url?: string;
}

export interface UploadStatusRecord {
  file_id?: string;
  status?: string;
  progress?: number;
  message?: string;
}

export interface UploadRecord {
  id: number | string;
  file_id?: string;
  filename?: string;
  status?: string;
  created_at?: string;
}

export async function uploadSingleFile(
  payload: UploadSingleRequest
): Promise<UploadSingleResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.patient_id) formData.append('patient_id', payload.patient_id);
  if (payload.description) formData.append('description', payload.description);

  const response = await apiClient.post('/api/v1/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return extractData<UploadSingleResponse>(response);
}

export async function uploadFileChunk(
  file: File | Blob,
  payload: ChunkUploadRequest
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_id', payload.file_id);
  formData.append('chunk_index', String(payload.chunk_index));
  formData.append('total_chunks', String(payload.total_chunks));
  formData.append('chunk_hash', payload.chunk_hash);
  if (payload.file_hash) {
    formData.append('file_hash', payload.file_hash);
  }

  const response = await apiClient.post('/api/v1/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return extractData<Record<string, unknown>>(response);
}

export async function completeChunkUpload(
  fileId: string,
  payload: { filename: string; file_hash?: string | null }
): Promise<UploadSingleResponse> {
  const response = await apiClient.post(
    `/api/v1/upload/complete/${fileId}`,
    new URLSearchParams(
      Object.entries(payload)
        .filter(([, value]) => value !== undefined && value !== null)
        .reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
    ),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return extractData<UploadSingleResponse>(response);
}

export async function getUploadStatus(
  fileId: string
): Promise<UploadStatusRecord> {
  const response = await apiClient.get(`/api/v1/upload/status/${fileId}`);
  return extractData<UploadStatusRecord>(response);
}

export async function getUploadRecords(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResult<UploadRecord>> {
  const response = await apiClient.get('/api/v1/upload/records', { params });
  return extractPaginatedData<UploadRecord>(response);
}
