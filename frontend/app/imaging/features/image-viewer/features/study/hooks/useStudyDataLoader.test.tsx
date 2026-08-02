import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import type { ImageFileDetail } from '@/services/imageServices/imageFileService';

const mockGetImageFile = jest.fn<
  (fileId: number) => Promise<ImageFileDetail>
>();

jest.mock('@/services/imageServices/imageFileService', () => ({
  getImageFile: (fileId: number) => mockGetImageFile(fileId),
}));

const { useStudyDataLoader } = jest.requireActual<
  typeof import('./useStudyDataLoader')
>('./useStudyDataLoader');

it('keeps the server annotation version after loading image details', async () => {
  mockGetImageFile.mockResolvedValue({
    id: 8,
    file_uuid: 'image-8',
    original_filename: 'image.png',
    file_type: 'PNG',
    file_size: 1024,
    storage_bucket: 'medical-image-files',
    object_key: 'image.png',
    uploaded_by: 1,
    patient_id: 2,
    patient_name: '测试患者',
    patient_identifier: 'P002',
    has_annotation: false,
    status: 'UPLOADED',
    upload_progress: 100,
    created_at: '2026-08-02T10:00:00',
    annotation: null,
    annotation_version: 7,
  });
  const setAnnotationVersion = jest.fn<(version: number) => void>();

  renderHook(() =>
    useStudyDataLoader(
      'IMG8',
      jest.fn(),
      jest.fn(),
      setAnnotationVersion,
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn(),
      { current: false },
      jest.fn()
    )
  );

  await waitFor(() => {
    expect(setAnnotationVersion).toHaveBeenCalledWith(7);
  });
  expect(setAnnotationVersion).not.toHaveBeenCalledWith(0);
});
