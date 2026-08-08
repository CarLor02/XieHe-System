import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';
import type {
  BatchUpdateImageExamTypeResult,
  ImageFile,
} from '@/services/imageServices/imageFileService';
import { useBatchExamTypeUpdate } from './useBatchExamTypeUpdate';

const mockBatchUpdateImageExamType = jest.fn<
  (ids: number[], examType: string) => Promise<BatchUpdateImageExamTypeResult>
>();

function makeImage(description: string): ImageFile {
  return {
    id: 7,
    file_uuid: 'file-7',
    original_filename: '7.png',
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 100,
    storage_bucket: 'images',
    object_key: '7.png',
    uploaded_by: 1,
    patient_id: 1,
    description,
    status: 'PROCESSED',
    upload_progress: 100,
    has_annotation: true,
    created_at: '2026-08-08T00:00:00',
  };
}

beforeEach(() => {
  mockBatchUpdateImageExamType.mockReset();
});

it('confirms, submits and retains selection state through the update callback', async () => {
  const reloadImages = jest.fn<() => Promise<void>>(async () => undefined);
  const onUpdated = jest.fn();
  mockBatchUpdateImageExamType.mockResolvedValue({
    updated_ids: [7],
    unchanged_ids: [],
    updated_count: 1,
    unchanged_count: 0,
    exam_type: '侧位X光片',
  });
  const { result } = renderHook(() =>
    useBatchExamTypeUpdate({
      selectedImages: [makeImage('正位X光片')],
      reloadImages,
      onUpdated,
      updateExamType: mockBatchUpdateImageExamType,
    })
  );

  act(() => result.current.setExamType('侧位X光片'));
  act(() => result.current.requestSet());
  expect(result.current.confirmOpen).toBe(true);

  await act(async () => result.current.confirmSet());

  expect(mockBatchUpdateImageExamType).toHaveBeenCalledWith([7], '侧位X光片');
  expect(onUpdated).toHaveBeenCalledWith([7], '侧位X光片');
  expect(reloadImages).toHaveBeenCalledTimes(1);
  expect(result.current.message).toContain('成功设置 1 张影像');
  expect(result.current.confirmOpen).toBe(false);
});

it('does not clear or submit images that already use the target type', () => {
  const { result } = renderHook(() =>
    useBatchExamTypeUpdate({
      selectedImages: [makeImage('正位X光片')],
      reloadImages: async () => undefined,
      onUpdated: jest.fn(),
      updateExamType: mockBatchUpdateImageExamType,
    })
  );

  act(() => result.current.setExamType('正位X光片'));
  act(() => result.current.requestSet());

  expect(result.current.confirmOpen).toBe(false);
  expect(result.current.message).toContain('无需重复设置');
  expect(mockBatchUpdateImageExamType).not.toHaveBeenCalled();
});
