import { apiClient, apiSdk, objectStorageClient } from '@/infrastructure/http';
import { createLogger } from '@/lib/logger';
import type { AnnotationDocument } from '@xiehe/imaging-core/annotation-document';
import type {
  AnnotationSaveResult,
  BatchUpdateImageExamTypeResult,
  ImageAnnotationBatchItem,
  ImageAccessVariant,
  ImageFile,
  ImageFileDetail,
  ImageFileDownloadUrl,
  ImageFileDownloadUrlsResponse,
  ImageFileListQuery,
  ImageFileListResponse,
  ImageFileStats,
  PagedSearchQuery,
} from '@xiehe/api-contracts';

export type {
  ImageAccessVariant,
  AnnotationSaveResult,
  BatchUpdateImageExamTypeResult,
  ImageAnnotationBatchItem,
  ImageAnnotationJson,
  ImageFile,
  ImageFileDetail,
  ImageFileDownloadUrl,
  ImageFileDownloadUrlError,
  ImageFileDownloadUrlsResponse,
  ImageFileListResponse,
  ImageFileStats,
  ImageFileSummary,
  ImageUploader,
} from '@xiehe/api-contracts';
export type ImageFileFilters = ImageFileListQuery;
export type ImageUploaderFilters = PagedSearchQuery;
export type AssignableImageTeamFilters = PagedSearchQuery;

const logger = createLogger('services.imageServices.imageFileService');

export function getImageFiles(
  filters: ImageFileFilters = {}
): Promise<ImageFileListResponse> {
  return apiSdk.imaging.list(filters);
}

export function getVisibleImageUploaders(filters: ImageUploaderFilters = {}) {
  return apiSdk.imaging.listUploaders(filters);
}

export function getAssignableImageTeams(
  filters: AssignableImageTeamFilters = {}
): ReturnType<typeof apiSdk.imaging.listAssignableTeams> {
  return apiSdk.imaging.listAssignableTeams(filters);
}

export function getAllImageFiles(
  filters: Omit<ImageFileFilters, 'page' | 'page_size'> = {},
  pageSize = 100
): Promise<ImageFile[]> {
  return apiSdk.imaging.listAll(filters, pageSize);
}

export function getPatientImages(
  patientId: number,
  page = 1,
  pageSize = 20
): Promise<ImageFileListResponse> {
  return apiSdk.imaging.listPatientImages(patientId, page, pageSize);
}

export function getImageFile(fileId: number): Promise<ImageFileDetail> {
  return apiSdk.imaging.get(fileId);
}

export function getImageNavigationIds(): Promise<number[]> {
  return apiSdk.imaging.getNavigationIds();
}

export function getImageAnnotations(
  ids: number[]
): Promise<ImageAnnotationBatchItem[]> {
  return ids.length === 0
    ? Promise.resolve([])
    : apiSdk.imaging.getAnnotations(ids);
}

export async function downloadImageFile(
  fileId: number,
  options: { signal?: AbortSignal } = {}
): Promise<Blob> {
  const download = await getImageFileDownloadUrl(fileId);
  return objectStorageClient.get<Blob>(download.url, {
    responseType: 'blob',
    signal: options.signal,
    auth: 'none',
    responseMode: 'raw',
  });
}

export function getImageFileDownloadUrl(
  fileId: number
): Promise<ImageFileDownloadUrl> {
  return apiSdk.imaging.getDownloadUrl(fileId);
}

export function getImageFileDownloadUrls(
  ids: number[],
  options: { signal?: AbortSignal; variant?: ImageAccessVariant } = {}
): Promise<ImageFileDownloadUrlsResponse> {
  return apiSdk.imaging.getDownloadUrls(ids, options);
}

export function deleteImageFile(
  fileId: number
): Promise<{ message: string; file_id: number }> {
  return apiSdk.imaging.delete(fileId);
}

export function updateImageExamType(fileId: number, description: string) {
  return apiSdk.imaging.updateExamType(fileId, description);
}

export function batchUpdateImageExamType(
  ids: number[],
  examType: string
): Promise<BatchUpdateImageExamTypeResult> {
  return apiSdk.imaging.batchUpdateExamType(ids, examType);
}

export function updateImageInfo(
  fileId: number,
  payload: { description: string; team_ids: number[] }
): Promise<ImageFile & { warning?: string | null }> {
  return apiSdk.imaging.updateInfo(fileId, payload);
}

export function renameImageFile(
  fileId: number,
  basename: string
): Promise<ImageFile> {
  return apiSdk.imaging.rename(fileId, basename);
}

export function replaceImageFileContent(
  fileId: number,
  file: File,
  options: { description?: string | null; team_ids?: number[] } = {}
): Promise<ImageFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.description !== undefined) {
    formData.append('description', options.description ?? '');
  }
  if (options.team_ids !== undefined) {
    formData.append('team_ids', JSON.stringify(options.team_ids));
  }
  // Multipart body is a Web adapter concern; the wire response stays shared.
  return apiClient.patch<ImageFile, FormData>(
    `/api/v1/image-files/${fileId}/content`,
    formData
  );
}

export function saveImageAnnotation(
  fileId: number,
  expectedVersion: number,
  annotation: AnnotationDocument
): Promise<AnnotationSaveResult> {
  return apiSdk.imaging.saveAnnotation(
    fileId,
    expectedVersion,
    annotation as unknown as Record<string, unknown>
  );
}

export function getImageStats(): Promise<ImageFileStats> {
  return apiSdk.imaging.getStats();
}

export async function getImagePreviewUrl(fileId: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const blob = await downloadImageFile(fileId, { signal: controller.signal });
    if (
      !blob.type.startsWith('image/') &&
      blob.type !== 'application/octet-stream' &&
      blob.type !== ''
    ) {
      throw new Error(`Unexpected content-type: ${blob.type}`);
    }
    return URL.createObjectURL(blob);
  } catch (error) {
    logger.warn(`[Preview] file ${fileId} 加载失败，使用占位图:`, error);
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cub3JnLzIwMDAvc3ZnPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWunuaXoOWbvueJhzwvdGV4dD48L3N2Zz4=';
  } finally {
    clearTimeout(timeout);
  }
}

export function imageIdToNumericId(imageId: string): string {
  return imageId.replace('IMG', '').replace(/^0+/, '') || '0';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const unit = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
}

const DEFAULT_DISPLAY_TIME_ZONE = 'Asia/Shanghai';

export function formatDate(dateString: string): string {
  const trimmed = dateString.trim();
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasTimeZone ? trimmed : `${trimmed}Z`);
  if (Number.isNaN(date.getTime())) return dateString;
  const options: Intl.DateTimeFormatOptions = {
    timeZone:
      process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE?.trim() ||
      DEFAULT_DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return date.toLocaleDateString('zh-CN', options);
  } catch {
    return date.toLocaleDateString('zh-CN', {
      ...options,
      timeZone: DEFAULT_DISPLAY_TIME_ZONE,
    });
  }
}
