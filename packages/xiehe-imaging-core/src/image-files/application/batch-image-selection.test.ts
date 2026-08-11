import { describe, expect, it } from 'vitest';

import {
  activateBatchSelectionMode,
  applyBatchExamTypeResult,
  createBatchImageSelectionState,
  toggleBatchImageSelection,
} from './batch-image-selection';

describe('batch image selection', () => {
  it('keeps cross-page selections and clears them when switching mode', () => {
    let state = activateBatchSelectionMode(
      createBatchImageSelectionState<{ id: number }>(),
      'export'
    );
    state = toggleBatchImageSelection(state, [{ id: 1 }], 1);
    state = toggleBatchImageSelection(state, [{ id: 2 }], 2);
    expect([...state.selectedImages.keys()]).toEqual([1, 2]);
    expect(
      activateBatchSelectionMode(state, 'set-exam-type').selectedImages.size
    ).toBe(0);
  });

  it('updates retained images after type changes', () => {
    let state = activateBatchSelectionMode(
      createBatchImageSelectionState<{ id: number; description: string }>(),
      'set-exam-type'
    );
    state = toggleBatchImageSelection(
      state,
      [{ id: 1, description: '正位X光片' }],
      1
    );
    state = applyBatchExamTypeResult(state, [1], '侧位X光片');
    expect(state.selectedImages.get(1)).toMatchObject({
      description: '侧位X光片',
      has_annotation: false,
      status: 'UPLOADED',
    });
  });
});
