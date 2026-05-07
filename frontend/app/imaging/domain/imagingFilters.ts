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
}: {
  page: number;
  pageSize: number;
  searchTerm: string;
  examType: string;
  reviewStatus: ReviewStatusFilter;
  dateFrom: string;
  dateTo: string;
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

  return filters;
}
