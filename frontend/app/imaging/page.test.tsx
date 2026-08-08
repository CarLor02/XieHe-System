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

jest.mock('@/app/imaging/features/batch-import/components/BatchImportOverlay', () => ({
  __esModule: true,
  default: () => <div>批量导入Overlay</div>,
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
    has_annotation: false,
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
    selectedProcessingStatus: 'all',
    dateFrom: '',
    dateTo: '',
    viewMode: 'grid',
    canUseUploaderView: true,
    canUseTeamView: false,
    selectedUploader: null,
    selectedTeamIds: [],
    myTeams: [],
    currentImagingHref: '/imaging',
    hasActiveFilters: false,
    preview: {
      imageUrls: {},
      previewStates: {},
      handlePreviewError: jest.fn(),
    },
    batchSelection: {
      activeMode: null,
      selectedIds: new Set<number>(),
      selectedImages: [],
      selectedCount: 0,
      activateMode: jest.fn(),
      exitMode: jest.fn(),
      clearSelection: jest.fn(),
      toggleSelection: jest.fn(),
      applyExamTypeResult: jest.fn(),
    },
    batchExport: {
      exportContent: 'original-image',
      exportContentOptions: [{ value: 'original-image', label: '原图影像' }],
      isExporting: false,
      exportProgress: 0,
      exportMessage: '',
      setExportContent: jest.fn(),
      reset: jest.fn(),
      startBatchExport: jest.fn(),
    },
    batchExamType: {
      examType: '',
      isSetting: false,
      message: '',
      confirmOpen: false,
      setExamType: jest.fn(),
      reset: jest.fn(),
      requestSet: jest.fn(),
      cancelSet: jest.fn(),
      confirmSet: jest.fn(),
    },
    batchImport: {
      setFileInputElement: jest.fn(),
      overlayOpen: false,
      files: [],
      patientId: '',
      examType: '正位X光片',
      ownershipScope: 'personal',
      teamIds: [],
      lrFlip: false,
      isUploading: false,
      message: '',
      openFileDialog: jest.fn(),
      handleFileInput: jest.fn(),
      closeOverlay: jest.fn(),
      setPatientId: jest.fn(),
      setExamType: jest.fn(),
      setOwnershipScope: jest.fn(),
      setTeamIds: jest.fn(),
      toggleFlip: jest.fn(),
      startImport: jest.fn(),
    },
    actions: {
      handleMoreAction: jest.fn(),
      renameTarget: null,
      renameBasename: '',
      renameExtension: '',
      renameError: null,
      renaming: false,
      handleRenameBasenameChange: jest.fn(),
      closeRenameDialog: jest.fn(),
      confirmRename: jest.fn(),
    },
    editOverlay: {
      openEditOverlay: jest.fn(),
      editState: null,
      handleExamTypeChange: jest.fn(),
      handleFlip: jest.fn(),
      handleCrop: jest.fn(),
      handleTeamIdsChange: jest.fn(),
      closeEditOverlay: jest.fn(),
      handleConfirm: jest.fn(),
      contentResetConfirmOpen: false,
      saving: false,
      cancelContentReplacement: jest.fn(),
      confirmContentReplacement: jest.fn(),
      downloading: false,
    },
    loadImages: jest.fn(),
    handleSelectBatchOperation: jest.fn(),
    exitBatchMode: jest.fn(),
    handleSearch: jest.fn(),
    clearFilters: jest.fn(),
    clearEmptyResultFilters: jest.fn(),
    loadUploaders: jest.fn(),
    loadAssignableTeams: jest.fn(),
    handleChangeUploader: jest.fn(),
    handleChangeTeams: jest.fn(),
    setSearchTerm: jest.fn(),
    setShowFilters: jest.fn(),
    setSelectedExamType: jest.fn(),
    setSelectedProcessingStatus: jest.fn(),
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

  it('renders the batch import overlay when selected files are being configured', () => {
    useImagingPageControllerMock.mockReturnValue(
      makeController({
        batchImport: {
          ...makeController().batchImport,
          overlayOpen: true,
          files: [
            {
              id: 'file-1',
              name: 'ap-001.png',
              size: 1024,
              type: 'image/png',
              uploadStatus: 'pending',
              aiStatus: 'pending',
            },
          ],
        },
      })
    );

    const { default: ImagingPage } = jest.requireActual<typeof import('./page')>('./page');
    render(<ImagingPage />);

    expect(screen.getByText('批量导入Overlay')).toBeTruthy();
  });
});
