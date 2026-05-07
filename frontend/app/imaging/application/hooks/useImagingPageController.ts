import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import {
  getImageFiles,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import {
  buildImageFileFilters,
  getReviewStatusFilterFromUrl,
  type ImagingViewMode,
  type ReviewStatusFilter,
} from '@/app/imaging/domain/imagingFilters';
import { useImagePreviewQueue } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import { useImageFileActions } from '@/app/imaging/features/image-actions/hooks/useImageFileActions';

const DEFAULT_PAGE_SIZE = 20;

export function useImagingPageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useUser();

  const urlReviewStatusFilter = getReviewStatusFilterFromUrl(
    searchParams.get('review_status'),
    searchParams.get('status')
  );

  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(
    urlReviewStatusFilter !== 'all'
  );
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedReviewStatus, setSelectedReviewStatus] =
    useState<ReviewStatusFilter>(urlReviewStatusFilter);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<ImagingViewMode>('grid');

  const hasActiveFilters = useMemo(
    () =>
      searchTerm.trim() !== '' ||
      selectedExamType !== 'all' ||
      selectedReviewStatus !== 'all',
    [searchTerm, selectedExamType, selectedReviewStatus]
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
      setLoading(false);
    } catch (loadError: unknown) {
      console.error('Failed to load images:', loadError);
      setError(getErrorMessage(loadError, '加载影像失败，请重试'));
      setImageFiles([]);
      setLoading(false);
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
  ]);

  const actions = useImageFileActions({
    imageFiles,
    reloadImages: loadImages,
  });

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    setDebouncedSearchTerm(searchTerm);
  }, [searchTerm]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedExamType('all');
    setSelectedReviewStatus('all');
    setDateFrom('');
    setDateTo('');
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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setSelectedReviewStatus(urlReviewStatusFilter);
    setShowFilters(urlReviewStatusFilter !== 'all');
    setCurrentPage(1);
  }, [urlReviewStatusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadImages();
    }
  }, [isAuthenticated, loadImages]);

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
    error,
    searchTerm,
    showFilters,
    selectedExamType,
    selectedReviewStatus,
    dateFrom,
    dateTo,
    viewMode,
    hasActiveFilters,
    preview,
    actions,
    loadImages,
    handleSearch,
    clearFilters,
    clearEmptyResultFilters,
    setSearchTerm,
    setShowFilters,
    setSelectedExamType,
    setSelectedReviewStatus,
    setDateFrom,
    setDateTo,
    setViewMode,
    setCurrentPage,
  };
}
