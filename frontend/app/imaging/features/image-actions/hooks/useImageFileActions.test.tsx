import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';

import type { ImageFile } from '@/services/imageServices/imageFileService';

const mockDeleteImageFile = jest.fn();
const mockDownloadImageFile = jest.fn();
const mockRenameImageFile =
  jest.fn<(fileId: number, basename: string) => Promise<ImageFile>>();

jest.mock('@/services/imageServices/imageFileService', () => ({
  deleteImageFile: (...args: unknown[]) => mockDeleteImageFile(...args),
  downloadImageFile: (...args: unknown[]) => mockDownloadImageFile(...args),
  renameImageFile: (fileId: number, basename: string) =>
    mockRenameImageFile(fileId, basename),
}));

const { useImageFileActions } = jest.requireActual<
  typeof import('./useImageFileActions')
>('./useImageFileActions');

const imageFile: ImageFile = {
  id: 1,
  file_uuid: 'file-1',
  original_filename: 'original.scan.png',
  file_type: 'PNG',
  mime_type: 'image/png',
  file_size: 1024,
  storage_bucket: 'medical-image-files',
  object_key: 'objects/file-1',
  uploaded_by: 7,
  status: 'UPLOADED',
  upload_progress: 100,
  has_annotation: false,
  created_at: '2026-07-29T10:00:00',
};

beforeEach(() => {
  mockDeleteImageFile.mockReset();
  mockDownloadImageFile.mockReset();
  mockRenameImageFile.mockReset();
});

it('renames an image, updates memory and reloads the active list', async () => {
  const reloadImages = jest.fn<() => void>();
  const onImageUpdated = jest.fn<(updatedImage: ImageFile) => void>();
  const updatedImage = {
    ...imageFile,
    original_filename: 'renamed.png',
  };
  mockRenameImageFile.mockResolvedValue(updatedImage);

  const { result } = renderHook(() =>
    useImageFileActions({
      imageFiles: [imageFile],
      reloadImages,
      onImageUpdated,
    })
  );

  await act(async () => {
    await result.current.handleMoreAction(1, 'rename');
  });

  expect(result.current.renameBasename).toBe('original.scan');
  expect(result.current.renameExtension).toBe('.png');

  act(() => {
    result.current.handleRenameBasenameChange('  renamed  ');
  });
  await act(async () => {
    await result.current.confirmRename();
  });

  expect(mockRenameImageFile).toHaveBeenCalledWith(1, 'renamed');
  expect(onImageUpdated).toHaveBeenCalledWith(updatedImage);
  expect(reloadImages).toHaveBeenCalledTimes(1);
  expect(result.current.renameTarget).toBeNull();
});

it('keeps the dialog open and does not call the API for a blank name', async () => {
  const { result } = renderHook(() =>
    useImageFileActions({
      imageFiles: [imageFile],
      reloadImages: jest.fn<() => void>(),
      onImageUpdated: jest.fn<(updatedImage: ImageFile) => void>(),
    })
  );

  await act(async () => {
    await result.current.handleMoreAction(1, 'rename');
  });
  act(() => {
    result.current.handleRenameBasenameChange('   ');
  });
  await act(async () => {
    await result.current.confirmRename();
  });

  expect(result.current.renameError).toBe('新影像名不能为空');
  expect(result.current.renameTarget?.id).toBe(1);
  expect(mockRenameImageFile).not.toHaveBeenCalled();
});
