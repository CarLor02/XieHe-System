import { act, renderHook } from '@testing-library/react';
import { expect, it } from '@jest/globals';
import type { ImageFile } from '@/services/imageServices/imageFileService';
import { useBatchImageSelection } from './useBatchImageSelection';

function makeImage(id: number, description = '正位X光片'): ImageFile {
  return {
    id,
    file_uuid: `file-${id}`,
    original_filename: `${id}.png`,
    file_type: 'PNG',
    mime_type: 'image/png',
    file_size: 100,
    storage_bucket: 'images',
    object_key: `${id}.png`,
    uploaded_by: 1,
    patient_id: 1,
    description,
    status: 'PROCESSED',
    upload_progress: 100,
    has_annotation: true,
    created_at: '2026-08-08T00:00:00',
  };
}

it('keeps selected images across pages and clears them when switching modes', () => {
  const firstPage = [makeImage(1)];
  const secondPage = [makeImage(2)];
  const { result, rerender } = renderHook(
    ({ images }) => useBatchImageSelection(images),
    { initialProps: { images: firstPage } }
  );

  act(() => {
    result.current.activateMode('export');
    result.current.toggleSelection(1);
  });
  rerender({ images: secondPage });
  act(() => result.current.toggleSelection(2));

  expect(result.current.selectedIds).toEqual(new Set([1, 2]));

  act(() => result.current.activateMode('set-exam-type'));

  expect(result.current.selectedCount).toBe(0);
  expect(result.current.activeMode).toBe('set-exam-type');
});

it('updates retained selections after a successful type change', () => {
  const { result } = renderHook(() => useBatchImageSelection([makeImage(1)]));

  act(() => {
    result.current.activateMode('set-exam-type');
    result.current.toggleSelection(1);
    result.current.applyExamTypeResult([1], '侧位X光片');
  });

  expect(result.current.selectedImages[0]).toMatchObject({
    description: '侧位X光片',
    has_annotation: false,
    status: 'UPLOADED',
  });
});
