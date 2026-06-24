import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ImageFileListResponse } from '@/services/imageServices/imageFileService';
import type { TeamListResponse } from '@/services/teamService';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

const mockUseUser = jest.fn();
const mockGetImageFiles = jest.fn<(filters?: unknown) => Promise<ImageFileListResponse>>();
const mockGetVisibleImageUploaders = jest.fn<(filters?: unknown) => Promise<unknown>>();
const mockGetMyTeams = jest.fn<() => Promise<TeamListResponse>>();
const mockResetPreviewQueue = jest.fn();
const mockSetOpenDropdown = jest.fn();
const mockHandlePreviewError = jest.fn();
const mockBatchExport = {
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
};
const mockImageFileActions = {
  openDropdown: null,
  setOpenDropdown: mockSetOpenDropdown,
  toggleImageActionMenu: jest.fn(),
  handleMoreAction: jest.fn(),
  openChangeTypeModal: jest.fn(),
  changeTypeModal: null,
  changeTypeSelected: '',
  changeTypeLoading: false,
  setChangeTypeSelected: jest.fn(),
  setChangeTypeModal: jest.fn(),
  handleChangeType: jest.fn(),
};
const mockEditOverlay = {
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
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/api', () => ({
  useUser: () => mockUseUser(),
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

jest.mock('@/services/imageServices/imageFileService', () => ({
  getImageFiles: (...args: unknown[]) => mockGetImageFiles(...args),
  getVisibleImageUploaders: (...args: unknown[]) => mockGetVisibleImageUploaders(...args),
}));

jest.mock('@/services/teamService', () => ({
  getMyTeams: () => mockGetMyTeams(),
}));

jest.mock('@/app/imaging/features/image-preview/hooks/useImagePreviewQueue', () => ({
  useImagePreviewQueue: () => ({
    imageUrls: {},
    previewStates: {},
    handlePreviewError: mockHandlePreviewError,
    resetPreviewQueue: mockResetPreviewQueue,
  }),
}));

jest.mock('@/app/imaging/features/batch-export/hooks', () => ({
  useBatchImageExport: () => mockBatchExport,
}));

jest.mock('@/app/imaging/features/image-actions/hooks/useImageFileActions', () => ({
  useImageFileActions: () => mockImageFileActions,
}));

jest.mock('@/app/imaging/features/image-actions/hooks/useImageEditOverlay', () => ({
  useImageEditOverlay: () => mockEditOverlay,
}));

const { useImagingPageController } = jest.requireActual<
  typeof import('./useImagingPageController')
>('./useImagingPageController');

function ImagingControllerProbe() {
  const controller = useImagingPageController();
  return (
    <div>{controller.canUseUploaderView ? 'uploader-view-allowed' : 'uploader-view-denied'}</div>
  );
}

describe('useImagingPageController', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
    mockUseUser.mockReset();
    mockGetImageFiles.mockReset();
    mockGetVisibleImageUploaders.mockReset();
    mockGetMyTeams.mockReset();
    mockResetPreviewQueue.mockReset();
    mockSetOpenDropdown.mockReset();

    mockUseUser.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 7,
        username: 'doctor',
        email: 'doctor@example.com',
        full_name: 'Doctor',
        role: 'doctor',
        permissions: [],
        is_active: true,
        is_system_admin: false,
        is_superuser: false,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    });
    mockGetImageFiles.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
  });

  it('allows uploader view for team administrators returned by my teams', async () => {
    mockGetMyTeams.mockResolvedValue({
      items: [
        {
          id: 11,
          name: '骨科团队',
          member_count: 3,
          is_member: true,
          my_role: 'ADMIN',
          my_status: 'ACTIVE',
        },
      ],
      total: 1,
    });

    render(<ImagingControllerProbe />);

    expect(screen.getByText('uploader-view-denied')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('uploader-view-allowed')).toBeTruthy();
    });
    expect(mockGetMyTeams).toHaveBeenCalledTimes(1);
  });
});
