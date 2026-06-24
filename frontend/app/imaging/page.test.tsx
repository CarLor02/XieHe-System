import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactNode } from 'react';

import type { ImageFile } from '@/services/imageServices/imageFileService';

const useImagingPageControllerMock = jest.fn();

jest.mock('./application/hooks/useImagingPageController', () => ({
  useImagingPageController: () => useImagingPageControllerMock(),
}));

jest.mock('@/app/imaging/features/image-preview/components/ImagePreview', () => ({
  __esModule: true,
  default: ({ imageFile }: { imageFile: ImageFile }) => (
    <div aria-label={imageFile.original_filename} role="img" />
  ),
}));

jest.mock('@/app/imaging/features/image-actions/components/ImageActionMenu', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/layout/AppShell', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/app/upload/_components/overlay/upload-options-overlay', () => ({
  __esModule: true,
  default: () => null,
}));

function makeImageFile(overrides: Partial<ImageFile> = {}): ImageFile {
  return {
    id: 1,
    file_uuid: 'file-1',
    original_filename: 'xray.png',
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: 'objects/xray.png',
    storage_etag: 'etag-1',
    uploaded_by: 7,
    uploader_name: '王医生',
    patient_id: 3,
    patient_name: '张三',
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-06-01T13:25:00',
    ...overrides,
  };
}

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    imageFiles: [],
    total: 0,
    currentPage: 1,
    pageSize: 20,
    loading: false,
    initialLoading: false,
    error: null,
    searchTerm: '',
    showFilters: false,
    selectedExamType: 'all',
    selectedReviewStatus: 'all',
    dateFrom: '',
    dateTo: '',
    viewMode: 'grid',
    canUseUploaderView: true,
    selectedUploader: null,
    currentImagingHref: '/imaging',
    hasActiveFilters: false,
    preview: {
      imageUrls: {},
      previewStates: {},
      handlePreviewError: jest.fn(),
    },
    batchExport: {
      isBatchExportMode: false,
      selectedExportIds: new Set<number>(),
      selectedExportCount: 0,
      exportContent: 'original-image',
      exportContentOptions: [{ value: 'original-image', label: '原图影像' }],
      isExporting: false,
      exportProgress: 0,
      exportMessage: '',
      setExportContent: jest.fn(),
      toggleBatchExportMode: jest.fn(),
      exitBatchExportMode: jest.fn(),
      clearExportSelection: jest.fn(),
      toggleExportSelection: jest.fn(),
      startBatchExport: jest.fn(),
    },
    actions: {
      openDropdown: null,
      setOpenDropdown: jest.fn(),
      toggleImageActionMenu: jest.fn(),
      handleMoreAction: jest.fn(),
      openChangeTypeModal: jest.fn(),
      changeTypeModal: null,
      changeTypeSelected: '',
      changeTypeLoading: false,
      setChangeTypeSelected: jest.fn(),
      setChangeTypeModal: jest.fn(),
      handleChangeType: jest.fn(),
    },
    editOverlay: {
      openEditOverlay: jest.fn(),
      editState: null,
      handleExamTypeChange: jest.fn(),
      handleFlip: jest.fn(),
      handleCrop: jest.fn(),
      closeEditOverlay: jest.fn(),
      handleConfirm: jest.fn(),
      contentResetConfirmOpen: false,
      saving: false,
      cancelContentReplacement: jest.fn(),
      confirmContentReplacement: jest.fn(),
      downloading: false,
    },
    loadImages: jest.fn(),
    handleSearch: jest.fn(),
    clearFilters: jest.fn(),
    clearEmptyResultFilters: jest.fn(),
    loadUploaders: jest.fn(),
    handleChangeUploader: jest.fn(),
    setSearchTerm: jest.fn(),
    setShowFilters: jest.fn(),
    setSelectedExamType: jest.fn(),
    setSelectedReviewStatus: jest.fn(),
    setDateFrom: jest.fn(),
    setDateTo: jest.fn(),
    setViewMode: jest.fn(),
    setCurrentPage: jest.fn(),
    ...overrides,
  };
}

describe('ImagingPage', () => {
  beforeEach(() => {
    useImagingPageControllerMock.mockReset();
  });

  it('shows the initial loading state before any image data has rendered', () => {
    useImagingPageControllerMock.mockReturnValue(
      makeController({ loading: true, initialLoading: true, imageFiles: [] })
    );

    const { default: ImagingPage } = jest.requireActual<typeof import('./page')>('./page');
    render(<ImagingPage />);

    expect(screen.getByText('加载影像数据中...')).toBeTruthy();
  });

  it('keeps the current image list visible while a filter refresh is loading', () => {
    useImagingPageControllerMock.mockReturnValue(
      makeController({
        loading: true,
        imageFiles: [makeImageFile()],
        total: 1,
      })
    );

    const { default: ImagingPage } = jest.requireActual<typeof import('./page')>('./page');
    render(<ImagingPage />);

    expect(screen.getByText('xray.png')).toBeTruthy();
    expect(screen.queryByText('加载影像数据中...')).not.toBeTruthy();
  });

  it('keeps the empty-result panel visible while refreshing after the first load', () => {
    useImagingPageControllerMock.mockReturnValue(
      makeController({
        loading: true,
        initialLoading: false,
        imageFiles: [],
        total: 0,
      })
    );

    const { default: ImagingPage } = jest.requireActual<typeof import('./page')>('./page');
    render(<ImagingPage />);

    expect(screen.getByText('还没有上传任何影像')).toBeTruthy();
    expect(screen.queryByText('加载影像数据中...')).not.toBeTruthy();
  });
});
