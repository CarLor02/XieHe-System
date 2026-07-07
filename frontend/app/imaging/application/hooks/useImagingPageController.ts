import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import {
  getAssignableImageTeams,
  getImageFiles,
  getVisibleImageUploaders,
  type ImageFile,
  type ImageUploader,
} from '@/services/imageServices/imageFileService';
import { getMyTeams, type TeamSummary } from '@/services/teamService';
import {
  buildImagingListHref,
  buildImageFileFilters,
  getReviewStatusFilterFromUrl,
  type ImagingViewMode,
  type ReviewStatusFilter,
} from '@/app/imaging/domain/imagingFilters';
import { canUseUploaderView } from '@/app/imaging/domain/uploaderViewPermission';
import { useImagePreviewQueue } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import { useImageFileActions } from '@/app/imaging/features/image-actions/hooks/useImageFileActions';
import { useImageEditOverlay } from '@/app/imaging/features/image-actions/hooks/useImageEditOverlay';
import { useBatchImageExport } from '@/app/imaging/features/batch-export/hooks';
import { useBatchImageImport } from '@/app/imaging/features/batch-import/hooks/useBatchImageImport';

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

function parseTeamIds(value: string | null) {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map(item => Number(item.trim()))
        .filter(id => Number.isInteger(id) && id > 0)
    )
  );
}

export function useImagingPageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useUser();
  const userId = user?.id ?? null;

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
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>(() =>
    parseTeamIds(searchParams.get('team_ids'))
  );
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);

  const canUseUploaderViewValue = useMemo(
    () => canUseUploaderView(user, myTeams),
    [myTeams, user]
  );
  const canUseTeamView = Boolean(user?.is_superuser || user?.is_system_admin);

  const hasActiveFilters = useMemo(
    () =>
      searchTerm.trim() !== '' ||
      selectedExamType !== 'all' ||
      selectedReviewStatus !== 'all' ||
      dateFrom !== '' ||
      dateTo !== '' ||
      selectedUploader !== null ||
      selectedTeamIds.length > 0,
    [
      dateFrom,
      dateTo,
      searchTerm,
      selectedExamType,
      selectedReviewStatus,
      selectedTeamIds.length,
      selectedUploader,
    ]
  );

  const preview = useImagePreviewQueue(imageFiles);
  const { resetPreviewQueue } = preview;
  const batchExport = useBatchImageExport(imageFiles);

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
          teamIds: selectedTeamIds,
        })
      );

      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      if (!Array.isArray(response.items)) {
        throw new Error('Response items is not an array');
      }

      setImageFiles(response.items);
      setTotal(response.total || 0);
    } catch (loadError: unknown) {
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
    selectedTeamIds,
    selectedUploader,
  ]);

  const actions = useImageFileActions({
    imageFiles,
    reloadImages: loadImages,
  });

  const editOverlay = useImageEditOverlay({
    reloadImages: loadImages,
  });

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

  const handleChangeTeams = useCallback((teamIds: number[]) => {
    setSelectedTeamIds(teamIds);
    setCurrentPage(1);
  }, []);

  const loadUploaders = useCallback(
    ({ page, pageSize, search }: { page: number; pageSize: number; search?: string }) =>
      getVisibleImageUploaders({
        page,
        page_size: pageSize,
        ...(search ? { search } : {}),
      }),
    []
  );

  const loadAssignableTeams = useCallback(
    ({ page, pageSize, search }: { page: number; pageSize: number; search?: string }) =>
      getAssignableImageTeams({
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
    setSelectedTeamIds([]);
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
    setSelectedTeamIds([]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyTeams(currentTeams => (currentTeams.length === 0 ? currentTeams : []));
      return;
    }

    let cancelled = false;

    getMyTeams()
      .then(response => {
        if (!cancelled) {
          setMyTeams(response.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMyTeams([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        teamIds: selectedTeamIds,
      }),
    [
      currentPage,
      dateFrom,
      dateTo,
      debouncedSearchTerm,
      selectedExamType,
      selectedReviewStatus,
      selectedTeamIds,
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

  const batchImport = useBatchImageImport({
    reloadImages: loadImages,
    loadTeams: loadAssignableTeams,
  });

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
    canUseUploaderView: canUseUploaderViewValue,
    canUseTeamView,
    selectedUploader,
    selectedTeamIds,
    myTeams,
    currentImagingHref,
    hasActiveFilters,
    preview,
    batchExport,
    batchImport,
    actions,
    editOverlay,
    loadImages,
    handleSearch,
    clearFilters,
    clearEmptyResultFilters,
    loadUploaders,
    loadAssignableTeams,
    handleChangeUploader,
    handleChangeTeams,
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
