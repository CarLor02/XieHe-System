import type { ImageFileFilters } from '@/services/imageServices/imageFileService';

export const EXAM_TYPES = [
  '正位X光片',
  '侧位X光片',
  '左侧曲位',
  '右侧曲位',
  '体态照片',
] as const;

export type ReviewStatusFilter = 'all' | 'reviewed' | 'unreviewed';
export type ImagingViewMode = 'grid' | 'list';

export function getReviewStatusFilterFromUrl(
  reviewStatus: string | null,
  legacyStatus: string | null
): ReviewStatusFilter {
  if (reviewStatus === 'reviewed' || reviewStatus === 'unreviewed') {
    return reviewStatus;
  }

  if (legacyStatus === 'pending') {
    return 'unreviewed';
  }

  return 'all';
}

export function buildImageFileFilters({
  page,
  pageSize,
  searchTerm,
  examType,
  reviewStatus,
  dateFrom,
  dateTo,
  uploadedBy,
  teamIds,
}: {
  page: number;
  pageSize: number;
  searchTerm: string;
  examType: string;
  reviewStatus: ReviewStatusFilter;
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
  if (reviewStatus !== 'all') filters.review_status = reviewStatus;
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
  reviewStatus,
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
  reviewStatus: ReviewStatusFilter;
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
  if (reviewStatus !== 'all') params.set('review_status', reviewStatus);
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
