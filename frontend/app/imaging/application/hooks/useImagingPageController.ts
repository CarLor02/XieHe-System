import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import {
  getImageFiles,
  getVisibleImageUploaders,
  type ImageFile,
  type ImageUploader,
} from '@/services/imageServices/imageFileService';
import {
  buildImagingListHref,
  buildImageFileFilters,
  getReviewStatusFilterFromUrl,
  type ImagingViewMode,
  type ReviewStatusFilter,
} from '@/app/imaging/domain/imagingFilters';
import { useImagePreviewQueue } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import { useImageFileActions } from '@/app/imaging/features/image-actions/hooks/useImageFileActions';
import { useImageEditOverlay } from '@/app/imaging/features/image-actions/hooks/useImageEditOverlay';

const DEFAULT_PAGE_SIZE = 20;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseViewMode(value: string | null): ImagingViewMode {
  return value === 'list' ? 'list' : 'grid';
}

function getUploaderName(uploader: ImageUploader | null) {
  if (!uploader) return null;
  return uploader.real_name || uploader.username || `用户 ${uploader.id}`;
}

function getInitialUploader(searchParams: ReturnType<typeof useSearchParams>) {
  const uploadedBy = searchParams.get('uploaded_by');
  const uploaderId = uploadedBy ? Number(uploadedBy) : NaN;
  if (!Number.isInteger(uploaderId) || uploaderId <= 0) return null;

  return {
    id: uploaderId,
    username: searchParams.get('uploader_name') || `user-${uploaderId}`,
    real_name: searchParams.get('uploader_name') || `用户 ${uploaderId}`,
  } satisfies ImageUploader;
}

function canUseUploaderView(user: ReturnType<typeof useUser>['user']) {
  const role = user?.role;
  return Boolean(
    user?.is_superuser ||
      user?.is_system_admin ||
      role === 'admin' ||
      role === 'system_admin' ||
      role === 'team_admin' ||
      role === 'ADMIN'
  );
}

export function useImagingPageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useUser();

  const urlReviewStatusFilter = getReviewStatusFilterFromUrl(
    searchParams.get('review_status'),
    searchParams.get('status')
  );

  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(() =>
    parsePositiveInt(searchParams.get('page'), 1)
  );
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [hasLoadedImagesOnce, setHasLoadedImagesOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('search') || ''
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    () => searchParams.get('search') || ''
  );
  const [showFilters, setShowFilters] = useState(
    urlReviewStatusFilter !== 'all'
  );
  const [selectedExamType, setSelectedExamType] = useState<string>(
    () => searchParams.get('description') || 'all'
  );
  const [selectedReviewStatus, setSelectedReviewStatus] =
    useState<ReviewStatusFilter>(urlReviewStatusFilter);
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('start_date') || ''
  );
  const [dateTo, setDateTo] = useState(
    () => searchParams.get('end_date') || ''
  );
  const [viewMode, setViewMode] = useState<ImagingViewMode>(() =>
    parseViewMode(searchParams.get('view'))
  );
  const [selectedUploader, setSelectedUploader] = useState<ImageUploader | null>(
    () => getInitialUploader(searchParams)
  );

  const hasActiveFilters = useMemo(
    () =>
      searchTerm.trim() !== '' ||
      selectedExamType !== 'all' ||
      selectedReviewStatus !== 'all' ||
      dateFrom !== '' ||
      dateTo !== '' ||
      selectedUploader !== null,
    [dateFrom, dateTo, searchTerm, selectedExamType, selectedReviewStatus, selectedUploader]
  );

  const preview = useImagePreviewQueue(imageFiles);
  const { resetPreviewQueue } = preview;

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      resetPreviewQueue();

      const response = await getImageFiles(
        buildImageFileFilters({
          page: currentPage,
          pageSize,
          searchTerm: debouncedSearchTerm,
          examType: selectedExamType,
          reviewStatus: selectedReviewStatus,
          dateFrom,
          dateTo,
          uploadedBy: selectedUploader?.id ?? null,
        })
      );

      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      if (!Array.isArray(response.items)) {
        console.error('Invalid response.items:', response);
        throw new Error('Response items is not an array');
      }

      setImageFiles(response.items);
      setTotal(response.total || 0);
    } catch (loadError: unknown) {
      console.error('Failed to load images:', loadError);
      setError(getErrorMessage(loadError, '加载影像失败，请重试'));
      setImageFiles([]);
    } finally {
      setLoading(false);
      setHasLoadedImagesOnce(true);
    }
  }, [
    currentPage,
    dateFrom,
    dateTo,
    debouncedSearchTerm,
    pageSize,
    resetPreviewQueue,
    selectedExamType,
    selectedReviewStatus,
    selectedUploader,
  ]);

  const actions = useImageFileActions({
    imageFiles,
    reloadImages: loadImages,
  });

  const editOverlay = useImageEditOverlay({ reloadImages: loadImages });

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    setDebouncedSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleChangeExamType = useCallback((value: string) => {
    setSelectedExamType(value);
    setCurrentPage(1);
  }, []);

  const handleChangeReviewStatus = useCallback((value: ReviewStatusFilter) => {
    setSelectedReviewStatus(value);
    setCurrentPage(1);
  }, []);

  const handleChangeDateFrom = useCallback((value: string) => {
    setDateFrom(value);
    setCurrentPage(1);
  }, []);

  const handleChangeDateTo = useCallback((value: string) => {
    setDateTo(value);
    setCurrentPage(1);
  }, []);

  const handleChangeUploader = useCallback(
    (_value: string, uploader: ImageUploader | null) => {
      setSelectedUploader(uploader);
      setCurrentPage(1);
    },
    []
  );

  const loadUploaders = useCallback(
    ({ page, pageSize, search }: { page: number; pageSize: number; search?: string }) =>
      getVisibleImageUploaders({
        page,
        page_size: pageSize,
        ...(search ? { search } : {}),
      }),
    []
  );

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedExamType('all');
    setSelectedReviewStatus('all');
    setDateFrom('');
    setDateTo('');
    setSelectedUploader(null);
    setCurrentPage(1);
    if (searchParams.toString()) {
      router.replace('/imaging', { scroll: false });
    }
  }, [router, searchParams]);

  const clearEmptyResultFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedExamType('all');
    setDateFrom('');
    setDateTo('');
    setSelectedUploader(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadImages();
    }
  }, [isAuthenticated, loadImages]);

  const currentImagingHref = useMemo(
    () =>
      buildImagingListHref({
        page: currentPage,
        searchTerm: debouncedSearchTerm,
        examType: selectedExamType,
        reviewStatus: selectedReviewStatus,
        dateFrom,
        dateTo,
        viewMode,
        uploadedBy: selectedUploader?.id ?? null,
        uploaderName: getUploaderName(selectedUploader),
      }),
    [
      currentPage,
      dateFrom,
      dateTo,
      debouncedSearchTerm,
      selectedExamType,
      selectedReviewStatus,
      selectedUploader,
      viewMode,
    ]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const targetQuery = currentImagingHref.split('?')[1] || '';
    if (targetQuery !== searchParams.toString()) {
      router.replace(currentImagingHref, { scroll: false });
    }
  }, [currentImagingHref, isAuthenticated, router, searchParams]);

  useEffect(() => {
    if (!actions.openDropdown) return;

    const closeDropdown = () => actions.setOpenDropdown(null);
    window.addEventListener('resize', closeDropdown);
    window.addEventListener('scroll', closeDropdown, true);

    return () => {
      window.removeEventListener('resize', closeDropdown);
      window.removeEventListener('scroll', closeDropdown, true);
    };
  }, [actions.openDropdown, actions.setOpenDropdown]);

  return {
    imageFiles,
    total,
    currentPage,
    pageSize,
    loading,
    initialLoading: loading && !hasLoadedImagesOnce,
    error,
    searchTerm,
    showFilters,
    selectedExamType,
    selectedReviewStatus,
    dateFrom,
    dateTo,
    viewMode,
    canUseUploaderView: canUseUploaderView(user),
    selectedUploader,
    currentImagingHref,
    hasActiveFilters,
    preview,
    actions,
    editOverlay,
    loadImages,
    handleSearch,
    clearFilters,
    clearEmptyResultFilters,
    loadUploaders,
    handleChangeUploader,
    setSearchTerm,
    setShowFilters,
    setSelectedExamType: handleChangeExamType,
    setSelectedReviewStatus: handleChangeReviewStatus,
    setDateFrom: handleChangeDateFrom,
    setDateTo: handleChangeDateTo,
    setViewMode,
    setCurrentPage,
  };
}
