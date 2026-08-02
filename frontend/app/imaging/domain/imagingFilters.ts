import type { ImageFileFilters } from '@/services/imageServices/imageFileService';

export const EXAM_TYPES = [
  '正位X光片',
  '侧位X光片',
  '左侧曲位',
  '右侧曲位',
  '体态照片',
] as const;

export type ProcessingStatusFilter =
  | 'all'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED';
export type ImagingViewMode = 'grid' | 'list';

export function getProcessingStatusFilterFromUrl(
  fileStatus: string | null,
  reviewStatus: string | null,
  legacyStatus: string | null
): ProcessingStatusFilter {
  if (
    fileStatus === 'UPLOADED' ||
    fileStatus === 'PROCESSING' ||
    fileStatus === 'PROCESSED' ||
    fileStatus === 'FAILED'
  ) {
    return fileStatus;
  }
  if (reviewStatus === 'reviewed') return 'PROCESSED';
  if (reviewStatus === 'unreviewed' || legacyStatus === 'pending') return 'UPLOADED';

  return 'all';
}

export function buildImageFileFilters({
  page,
  pageSize,
  searchTerm,
  examType,
  processingStatus,
  dateFrom,
  dateTo,
  uploadedBy,
  teamIds,
}: {
  page: number;
  pageSize: number;
  searchTerm: string;
  examType: string;
  processingStatus: ProcessingStatusFilter;
  dateFrom: string;
  dateTo: string;
  uploadedBy?: number | null;
  teamIds?: number[];
}): ImageFileFilters {
  const filters: ImageFileFilters = {
    page,
    page_size: pageSize,
  };

  if (searchTerm) filters.search = searchTerm;
  if (examType !== 'all') filters.description = examType;
  if (processingStatus !== 'all') filters.file_status = processingStatus;
  if (dateFrom) filters.start_date = dateFrom;
  if (dateTo) filters.end_date = dateTo;
  if (uploadedBy !== null && uploadedBy !== undefined) {
    filters.uploaded_by = uploadedBy;
  }
  if (teamIds?.length) {
    filters.team_ids = teamIds;
  }

  return filters;
}

export function buildImagingListHref({
  page,
  searchTerm,
  examType,
  processingStatus,
  dateFrom,
  dateTo,
  viewMode,
  uploadedBy,
  uploaderName,
  teamIds,
}: {
  page: number;
  searchTerm: string;
  examType: string;
  processingStatus: ProcessingStatusFilter;
  dateFrom: string;
  dateTo: string;
  viewMode: ImagingViewMode;
  uploadedBy?: number | null;
  uploaderName?: string | null;
  teamIds?: number[];
}) {
  const params = new URLSearchParams();

  if (page > 1) params.set('page', String(page));
  if (searchTerm) params.set('search', searchTerm);
  if (examType !== 'all') params.set('description', examType);
  if (processingStatus !== 'all') params.set('file_status', processingStatus);
  if (dateFrom) params.set('start_date', dateFrom);
  if (dateTo) params.set('end_date', dateTo);
  if (viewMode !== 'grid') params.set('view', viewMode);
  if (uploadedBy !== null && uploadedBy !== undefined) {
    params.set('uploaded_by', String(uploadedBy));
    if (uploaderName) params.set('uploader_name', uploaderName);
  }
  if (teamIds?.length) {
    params.set('team_ids', teamIds.join(','));
  }

  const query = params.toString();
  return query ? `/imaging?${query}` : '/imaging';
}
