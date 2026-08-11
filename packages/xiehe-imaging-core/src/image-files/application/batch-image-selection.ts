export type BatchSelectionMode = 'export' | 'set-exam-type';
export type BatchOperation = 'import' | BatchSelectionMode;

export interface BatchSelectableImage {
  id: number;
  description?: string | null;
  has_annotation?: boolean;
  status?: string;
}

export interface BatchImageSelectionState<T extends BatchSelectableImage> {
  activeMode: BatchSelectionMode | null;
  selectedImages: Map<number, T>;
}

export function createBatchImageSelectionState<
  T extends BatchSelectableImage,
>(): BatchImageSelectionState<T> {
  return { activeMode: null, selectedImages: new Map() };
}

export function activateBatchSelectionMode<T extends BatchSelectableImage>(
  state: BatchImageSelectionState<T>,
  mode: BatchSelectionMode
): BatchImageSelectionState<T> {
  return {
    activeMode: mode,
    selectedImages:
      state.activeMode === mode ? new Map(state.selectedImages) : new Map(),
  };
}

export function exitBatchSelectionMode<
  T extends BatchSelectableImage,
>(): BatchImageSelectionState<T> {
  return createBatchImageSelectionState<T>();
}

export function toggleBatchImageSelection<T extends BatchSelectableImage>(
  state: BatchImageSelectionState<T>,
  visibleImages: readonly T[],
  imageId: number
): BatchImageSelectionState<T> {
  const selectedImages = new Map(state.selectedImages);
  if (selectedImages.has(imageId)) {
    selectedImages.delete(imageId);
  } else {
    const image = visibleImages.find(item => item.id === imageId);
    if (image) selectedImages.set(imageId, image);
  }
  return { ...state, selectedImages };
}

export function applyBatchExamTypeResult<T extends BatchSelectableImage>(
  state: BatchImageSelectionState<T>,
  updatedIds: readonly number[],
  examType: string
): BatchImageSelectionState<T> {
  const selectedImages = new Map(state.selectedImages);
  for (const imageId of updatedIds) {
    const image = selectedImages.get(imageId);
    if (!image) continue;
    selectedImages.set(imageId, {
      ...image,
      description: examType,
      has_annotation: false,
      status: 'UPLOADED',
    });
  }
  return { ...state, selectedImages };
}

export function getBatchSelectionLabel(mode: BatchSelectionMode): string {
  return mode === 'export' ? '选择导出' : '选择设置';
}
