export const EXAM_TYPES = [
  '正位X光片',
  '侧位X光片',
  '左侧曲位',
  '右侧曲位',
  '体态照片',
] as const;

export type ProcessingStatusFilter =
  'all' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export type ImagingViewMode = 'grid' | 'list';

export interface ImageFileFilterQuery {
  page?: number;
  page_size?: number;
  search?: string;
  description?: string;
  file_status?: Exclude<ProcessingStatusFilter, 'all'>;
  start_date?: string;
  end_date?: string;
  uploaded_by?: number;
  team_ids?: number[];
}

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
  if (reviewStatus === 'unreviewed' || legacyStatus === 'pending') {
    return 'UPLOADED';
  }
  return 'all';
}

export function buildImageFileFilters(input: {
  page: number;
  pageSize: number;
  searchTerm: string;
  examType: string;
  processingStatus: ProcessingStatusFilter;
  dateFrom: string;
  dateTo: string;
  uploadedBy?: number | null;
  teamIds?: number[];
}): ImageFileFilterQuery {
  const filters: ImageFileFilterQuery = {
    page: input.page,
    page_size: input.pageSize,
  };
  if (input.searchTerm) filters.search = input.searchTerm;
  if (input.examType !== 'all') filters.description = input.examType;
  if (input.processingStatus !== 'all') {
    filters.file_status = input.processingStatus;
  }
  if (input.dateFrom) filters.start_date = input.dateFrom;
  if (input.dateTo) filters.end_date = input.dateTo;
  if (input.uploadedBy !== null && input.uploadedBy !== undefined) {
    filters.uploaded_by = input.uploadedBy;
  }
  if (input.teamIds?.length) filters.team_ids = [...input.teamIds];
  return filters;
}

export function buildImagingListHref(input: {
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
}): string {
  const params = new URLSearchParams();
  if (input.page > 1) params.set('page', String(input.page));
  if (input.searchTerm) params.set('search', input.searchTerm);
  if (input.examType !== 'all') params.set('description', input.examType);
  if (input.processingStatus !== 'all') {
    params.set('file_status', input.processingStatus);
  }
  if (input.dateFrom) params.set('start_date', input.dateFrom);
  if (input.dateTo) params.set('end_date', input.dateTo);
  if (input.viewMode !== 'grid') params.set('view', input.viewMode);
  if (input.uploadedBy !== null && input.uploadedBy !== undefined) {
    params.set('uploaded_by', String(input.uploadedBy));
    if (input.uploaderName) params.set('uploader_name', input.uploaderName);
  }
  if (input.teamIds?.length) params.set('team_ids', input.teamIds.join(','));
  const query = params.toString();
  return query ? `/imaging?${query}` : '/imaging';
}
