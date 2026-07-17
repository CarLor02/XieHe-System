import type {
  BatchImportAiStatus,
  BatchImportFileItem,
  BatchImportUploadStatus,
} from './types';
import type { ImageImportItem } from '@/services/imageServices';

export function mapUploadStatus(
  status: ImageImportItem['upload_status']
): BatchImportUploadStatus {
  if (status === 'FAILED') return 'error';
  if (status === 'UPLOADED') return 'uploaded';
  if (status === 'UPLOADING' || status === 'SESSION_CREATED') return 'uploading';
  return 'pending';
}

export function mapAiStatus(
  status: ImageImportItem['ai_status']
): BatchImportAiStatus {
  return status.toLowerCase() as BatchImportAiStatus;
}

export function patchFromServerItem(
  item: ImageImportItem
): Partial<BatchImportFileItem> {
  return {
    imageFileId: item.image_file_id ?? undefined,
    uploadStatus: mapUploadStatus(item.upload_status),
    aiStatus: mapAiStatus(item.ai_status),
    error: item.error ?? null,
  };
}
