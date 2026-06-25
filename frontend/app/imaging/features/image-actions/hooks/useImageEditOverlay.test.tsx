import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { useEffect } from 'react';

import type { CropArea } from '@/app/upload/_components/overlay/upload-options-overlay';
import type {
  downloadImageFile,
  ImageFile,
  replaceImageFileContent,
  updateImageInfo,
} from '@/services/imageServices/imageFileService';

const mockDownloadImageFile = jest.fn<typeof downloadImageFile>();
const mockReplaceImageFileContent =
  jest.fn<typeof replaceImageFileContent>();
const mockUpdateImageInfo = jest.fn<typeof updateImageInfo>();

jest.mock('@/services/imageServices/imageFileService', () => ({
  downloadImageFile: mockDownloadImageFile,
  replaceImageFileContent: mockReplaceImageFileContent,
  updateImageInfo: mockUpdateImageInfo,
}));

const { useImageEditOverlay } = jest.requireActual<
  typeof import('./useImageEditOverlay')
>('./useImageEditOverlay');

type HookValue = ReturnType<typeof useImageEditOverlay>;

function makeImageFile(): ImageFile {
  return {
    id: 1,
    file_uuid: 'file-1',
    original_filename: 'xray.png',
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 8,
    storage_bucket: 'medical-image-files',
    object_key: 'objects/xray.png',
    storage_etag: 'etag-1',
    uploaded_by: 7,
    patient_id: 3,
    description: '正位X光片',
    team_ids: [11],
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-06-10T10:00:00',
  };
}

function HookHarness({
  reloadImages,
  onValue,
}: {
  reloadImages: () => void;
  onValue: (value: HookValue) => void;
}) {
  const value = useImageEditOverlay({ reloadImages });

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

const originalImage = global.Image;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

let createElementSpy: jest.SpiedFunction<typeof document.createElement>;
let objectUrlIndex = 0;
let croppedBlob: Blob;

beforeEach(() => {
  objectUrlIndex = 0;
  croppedBlob = new Blob(['cropped'], { type: 'image/png' });

  class TestImage {
    naturalWidth = 100;
    naturalHeight = 100;
    onload: (() => void) | null = null;

    set src(_value: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  }

  Object.defineProperty(global, 'Image', {
    configurable: true,
    writable: true,
    value: TestImage,
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(() => {
      objectUrlIndex += 1;
      return `blob:test-${objectUrlIndex}`;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });

  const originalCreateElement = document.createElement.bind(document);
  createElementSpy = jest
    .spyOn(document, 'createElement')
    .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'canvas') {
        Object.defineProperty(element, 'getContext', {
          configurable: true,
          value: jest.fn(() => ({
            drawImage: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
          })),
        });
        Object.defineProperty(element, 'toBlob', {
          configurable: true,
          value: (callback: BlobCallback) => callback(croppedBlob),
        });
      }
      return element;
    });

  mockDownloadImageFile.mockResolvedValue(
    new Blob(['original'], { type: 'image/png' })
  );
  mockReplaceImageFileContent.mockResolvedValue({
    ...makeImageFile(),
    storage_etag: 'new-etag',
  });
  mockUpdateImageInfo.mockResolvedValue(makeImageFile());
});

afterEach(() => {
  localStorage.clear();
  createElementSpy.mockRestore();
  Object.defineProperty(global, 'Image', {
    configurable: true,
    writable: true,
    value: originalImage,
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: originalCreateObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: originalRevokeObjectURL,
  });
  jest.clearAllMocks();
});

it('updates image type and team ownership without replacing file content', async () => {
  const reloadImages = jest.fn();
  let latest: HookValue | null = null;

  render(
    <HookHarness
      reloadImages={reloadImages}
      onValue={value => {
        latest = value;
      }}
    />
  );

  await act(async () => {
    await latest!.openEditOverlay(makeImageFile());
  });

  await waitFor(() => {
    expect(latest!.editState).not.toBeNull();
  });

  await act(async () => {
    latest!.handleTeamIdsChange([11, 12]);
    latest!.handleExamTypeChange('1', '侧位X光片');
  });

  await act(async () => {
    await latest!.handleConfirm();
  });

  expect(mockUpdateImageInfo).toHaveBeenCalledWith(1, {
    description: '侧位X光片',
    team_ids: [11, 12],
  });
  expect(mockReplaceImageFileContent).not.toHaveBeenCalled();
  expect(reloadImages).toHaveBeenCalledTimes(1);
});

it('asks for confirmation and replaces the same image content after crop', async () => {
  const reloadImages = jest.fn();
  let latest: HookValue | null = null;

  render(
    <HookHarness
      reloadImages={reloadImages}
      onValue={value => {
        latest = value;
      }}
    />
  );

  await act(async () => {
    await latest!.openEditOverlay(makeImageFile());
  });

  await waitFor(() => {
    expect(latest!.editState).not.toBeNull();
  });

  const confirmBeforeCropStateIsRendered = latest!.handleConfirm;

  await act(async () => {
    await latest!.handleCrop('1', {
      x: 0,
      y: 0,
      width: 0.5,
      height: 0.5,
    });
    await confirmBeforeCropStateIsRendered();
  });

  expect(latest!.contentResetConfirmOpen).toBe(true);
  expect(mockReplaceImageFileContent).not.toHaveBeenCalled();

  await act(async () => {
    await latest!.confirmContentReplacement();
  });

  const replacedFile = mockReplaceImageFileContent.mock.calls[0][1] as File;
  expect(mockReplaceImageFileContent).toHaveBeenCalledWith(
    1,
    expect.any(File),
    { description: '正位X光片', team_ids: [11] }
  );
  expect(replacedFile.size).toBe(croppedBlob.size);
  expect(reloadImages).toHaveBeenCalledTimes(1);
});

it('keeps pending crop unapplied until content replacement is confirmed', async () => {
  const reloadImages = jest.fn();
  let latest: HookValue | null = null;

  render(
    <HookHarness
      reloadImages={reloadImages}
      onValue={value => {
        latest = value;
      }}
    />
  );

  await act(async () => {
    await latest!.openEditOverlay(makeImageFile());
  });

  await waitFor(() => {
    expect(latest!.editState).not.toBeNull();
  });

  const confirm = latest!.handleConfirm as (options: {
    pendingCrop: CropArea;
  }) => Promise<void>;

  await act(async () => {
    await confirm({
      pendingCrop: {
        x: 0,
        y: 0,
        width: 0.5,
        height: 0.5,
      },
    });
  });

  expect(latest!.contentResetConfirmOpen).toBe(true);
  expect(latest!.editState?.cropped).toBe(false);
  expect(mockUpdateImageInfo).not.toHaveBeenCalled();
  expect(mockReplaceImageFileContent).not.toHaveBeenCalled();

  await act(async () => {
    await latest!.confirmContentReplacement();
  });

  const replacedFile = mockReplaceImageFileContent.mock.calls[0][1] as File;
  expect(replacedFile.size).toBe(croppedBlob.size);
  expect(reloadImages).toHaveBeenCalledTimes(1);
});

it('clears local annotation cache after replacing image content', async () => {
  localStorage.setItem('annotations_1', '{"measurements":[{"id":"old"}]}');
  localStorage.setItem('annotations_file-1', '{"vertebraeLayer":[{"label":"T1-1"}]}');
  localStorage.setItem('annotations_IMG001', '{"vertebraeLayer":[{"label":"T1-2"}]}');

  const reloadImages = jest.fn();
  let latest: HookValue | null = null;

  render(
    <HookHarness
      reloadImages={reloadImages}
      onValue={value => {
        latest = value;
      }}
    />
  );

  await act(async () => {
    await latest!.openEditOverlay(makeImageFile());
  });

  await waitFor(() => {
    expect(latest!.editState).not.toBeNull();
  });

  await act(async () => {
    await latest!.handleCrop('1', {
      x: 0,
      y: 0,
      width: 0.5,
      height: 0.5,
    });
    await latest!.handleConfirm();
  });

  await act(async () => {
    await latest!.confirmContentReplacement();
  });

  expect(localStorage.getItem('annotations_1')).toBeNull();
  expect(localStorage.getItem('annotations_file-1')).toBeNull();
  expect(localStorage.getItem('annotations_IMG001')).toBeNull();
});
