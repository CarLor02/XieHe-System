import { useCallback, useMemo, useState } from 'react';
import {
  activateBatchSelectionMode,
  applyBatchExamTypeResult,
  createBatchImageSelectionState,
  exitBatchSelectionMode,
  toggleBatchImageSelection,
  type BatchSelectionMode,
} from '@xiehe/imaging-core/image-files';

import type { ImageFile } from '@/services/imageServices/imageFileService';

/** React 只保存公共状态机结果，跨页选择与模式切换规则由 core 维护。 */
export function useBatchImageSelection(imageFiles: ImageFile[]) {
  const [state, setState] = useState(() =>
    createBatchImageSelectionState<ImageFile>()
  );
  const selectedIds = useMemo(
    () => new Set(state.selectedImages.keys()),
    [state.selectedImages]
  );
  const selectedImages = useMemo(
    () => Array.from(state.selectedImages.values()),
    [state.selectedImages]
  );

  const clearSelection = useCallback(() => {
    setState(current => ({ ...current, selectedImages: new Map() }));
  }, []);
  const activateMode = useCallback((mode: BatchSelectionMode) => {
    setState(current => activateBatchSelectionMode(current, mode));
  }, []);
  const exitMode = useCallback(() => {
    setState(exitBatchSelectionMode<ImageFile>());
  }, []);
  const toggleSelection = useCallback(
    (imageId: number) => {
      setState(current =>
        toggleBatchImageSelection(current, imageFiles, imageId)
      );
    },
    [imageFiles]
  );
  const applyExamTypeResult = useCallback(
    (updatedIds: number[], examType: string) => {
      setState(current =>
        applyBatchExamTypeResult(current, updatedIds, examType)
      );
    },
    []
  );

  return {
    activeMode: state.activeMode,
    selectedIds,
    selectedImages,
    selectedCount: state.selectedImages.size,
    activateMode,
    exitMode,
    clearSelection,
    toggleSelection,
    applyExamTypeResult,
  };
}
