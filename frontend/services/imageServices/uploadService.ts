import {
  apiClient,
  normalizeLegacyPagination,
  objectStorageClient,
  type PaginatedResult,
} from '@/infrastructure/http';

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

export interface BatchCreateUploadFile {
  client_file_id: string;
  filename: string;
  size: number;
  mime_type: string;
  file_hash?: string | null;
}

export interface ImageImportConfig {
  max_files: number;
  session_window_size: number;
}

export interface ImageImportItem {
  id: number;
  client_file_id: string;
  filename: string;
  size: number;
  mime_type: string;
  image_file_id?: number | null;
  upload_status:
    'PENDING' | 'SESSION_CREATED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  ai_status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageImportBatch {
  batch_id: string;
  patient_id: number;
  description?: string | null;
  team_ids: number[];
  status:
    'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED';
  total_items: number;
  uploaded_items: number;
  succeeded_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface CreatedImageImportBatch extends ImageImportBatch {
  items: ImageImportItem[];
}

export interface ImageImportUploadSession extends UploadSession {
  item_id: number;
  client_file_id: string;
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
  return apiClient.post<UploadSession>('/api/v1/upload/sessions', payload);
}

export async function completeImageUploadSession(
  imageFileId: number,
  payload: {
    upload_id: string;
    parts: CompletedUploadPart[];
    file_hash?: string | null;
  }
): Promise<UploadStatusRecord> {
  return apiClient.post<UploadStatusRecord>(
    `/api/v1/upload/sessions/${imageFileId}/complete`,
    payload
  );
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
  if (!etag) {
    throw new Error('对象存储未返回 ETag');
  }
  return etag.replace(/^"|"$/g, '');
}

export async function getImageImportConfig(): Promise<ImageImportConfig> {
  return apiClient.get<ImageImportConfig>('/api/v1/upload/batches/config');
}

export async function createImageImportBatch(payload: {
  patient_id: number;
  description?: string | null;
  team_ids?: number[];
  files: BatchCreateUploadFile[];
}): Promise<CreatedImageImportBatch> {
  return apiClient.post<CreatedImageImportBatch>(
    '/api/v1/upload/batches',
    payload
  );
}

export async function createImageImportSessions(
  batchId: string,
  itemIds: number[]
): Promise<{ items: ImageImportUploadSession[] }> {
  return apiClient.post<{ items: ImageImportUploadSession[] }>(
    `/api/v1/upload/batches/${batchId}/sessions`,
    { item_ids: itemIds }
  );
}

export async function completeImageImportItem(
  batchId: string,
  itemId: number,
  payload: {
    upload_id: string;
    parts: CompletedUploadPart[];
    file_hash?: string | null;
  }
): Promise<ImageImportItem> {
  return apiClient.post<ImageImportItem>(
    `/api/v1/upload/batches/${batchId}/items/${itemId}/complete`,
    payload
  );
}

export async function markImageImportUploadFailed(
  batchId: string,
  itemId: number,
  error: string
): Promise<ImageImportItem> {
  return apiClient.post<ImageImportItem>(
    `/api/v1/upload/batches/${batchId}/items/${itemId}/upload-failed`,
    { error }
  );
}

export async function enqueueImageImportItem(
  batchId: string,
  itemId: number
): Promise<ImageImportItem> {
  return apiClient.post<ImageImportItem>(
    `/api/v1/upload/batches/${batchId}/items/${itemId}/enqueue`
  );
}

export async function getImageImportBatches(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<PaginatedResult<ImageImportBatch>> {
  const data = await apiClient.get<unknown>('/api/v1/upload/batches', {
    params,
  });
  return normalizeLegacyPagination<ImageImportBatch>(data);
}

export async function getImageImportItems(
  batchId: string,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResult<ImageImportItem>> {
  const data = await apiClient.get<unknown>(
    `/api/v1/upload/batches/${batchId}/items`,
    { params }
  );
  return normalizeLegacyPagination<ImageImportItem>(data);
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
    const etag = await uploadObjectPart(part.url, file.slice(start, end));
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
  const data = await apiClient.get<UploadStatusRecord>(
    `/api/v1/upload/status/${imageFileId}`
  );
  return {
    ...data,
    progress: data.upload_progress,
  };
}

export async function getUploadRecords(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResult<UploadRecord>> {
  const data = await apiClient.get<unknown>('/api/v1/upload/records', {
    params,
  });
  return normalizeLegacyPagination<UploadRecord>(data);
}
