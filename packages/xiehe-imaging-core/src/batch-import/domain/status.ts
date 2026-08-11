export type BatchImportUploadStatus =
  'pending' | 'preparing' | 'uploading' | 'uploaded' | 'error';
export type BatchImportAiStatus =
  'pending' | 'queued' | 'running' | 'succeeded' | 'failed';

export interface BatchImportServerItem {
  image_file_id?: number | null;
  upload_status:
    'PENDING' | 'SESSION_CREATED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  ai_status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string | null;
}

export interface BatchImportServerPatch {
  imageFileId?: number;
  uploadStatus: BatchImportUploadStatus;
  aiStatus: BatchImportAiStatus;
  error: string | null;
}

export function patchFromServerItem(
  item: BatchImportServerItem
): BatchImportServerPatch {
  return {
    imageFileId: item.image_file_id ?? undefined,
    uploadStatus:
      item.upload_status === 'FAILED'
        ? 'error'
        : item.upload_status === 'UPLOADED'
          ? 'uploaded'
          : item.upload_status === 'UPLOADING' ||
              item.upload_status === 'SESSION_CREATED'
            ? 'uploading'
            : 'pending',
    aiStatus: item.ai_status.toLowerCase() as BatchImportAiStatus,
    error: item.error ?? null,
  };
}
