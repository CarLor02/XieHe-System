import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';
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

const setters = {
  setStudyData: jest.fn(),
  setStudyLoading: jest.fn(),
  setStudyLoadError: jest.fn(),
  setAnnotationVersion: jest.fn(),
  setMeasurements: jest.fn(),
  setStandardDistance: jest.fn(),
  setStandardDistancePoints: jest.fn(),
  setPointBindings: jest.fn(),
  setReportText: jest.fn(),
  applyHydratedKeypointState: jest.fn(),
};

beforeEach(() => {
  mockGetImageFile.mockReset();
  Object.values(setters).forEach(setter => setter.mockClear());
});

it('applies the complete server editor state including annotation version', async () => {
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

  renderHook(() =>
    useStudyDataLoader({ imageId: 'IMG8', reloadToken: 0, ...setters })
  );

  await waitFor(() => {
    expect(setters.setAnnotationVersion).toHaveBeenCalledWith(7);
  });
  expect(setters.setStandardDistance).toHaveBeenCalledWith(100);
  expect(setters.setStudyLoadError).toHaveBeenLastCalledWith(null);
});

it('keeps the editor blocked when the API request fails', async () => {
  mockGetImageFile.mockRejectedValue(new Error('network unavailable'));

  renderHook(() =>
    useStudyDataLoader({ imageId: 'IMG8', reloadToken: 0, ...setters })
  );

  await waitFor(() => {
    expect(setters.setStudyLoadError).toHaveBeenCalledWith(
      'network unavailable'
    );
  });
  expect(setters.setStudyData).toHaveBeenLastCalledWith(null);
});
