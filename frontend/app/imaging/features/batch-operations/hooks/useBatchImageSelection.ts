import { useCallback, useMemo, useState } from 'react';
import type { ImageFile } from '@/services/imageServices/imageFileService';
import type { BatchSelectionMode } from '../domain/batch-operation';

export function useBatchImageSelection(imageFiles: ImageFile[]) {
  const [activeMode, setActiveMode] = useState<BatchSelectionMode | null>(null);
  const [selectedImages, setSelectedImages] = useState<Map<number, ImageFile>>(
    new Map()
  );

  const selectedIds = useMemo(
    () => new Set(selectedImages.keys()),
    [selectedImages]
  );
  const selectedImageList = useMemo(
    () => Array.from(selectedImages.values()),
    [selectedImages]
  );

  const clearSelection = useCallback(() => {
    setSelectedImages(new Map());
  }, []);

  const activateMode = useCallback(
    (mode: BatchSelectionMode) => {
      if (activeMode !== mode) {
        setSelectedImages(new Map());
      }
      setActiveMode(mode);
    },
    [activeMode]
  );

  const exitMode = useCallback(() => {
    setActiveMode(null);
    setSelectedImages(new Map());
  }, []);

  const toggleSelection = useCallback(
    (imageId: number) => {
      const imageFile = imageFiles.find(image => image.id === imageId);
      setSelectedImages(current => {
        const next = new Map(current);
        if (next.has(imageId)) {
          next.delete(imageId);
        } else if (imageFile) {
          next.set(imageId, imageFile);
        }
        return next;
      });
    },
    [imageFiles]
  );

  const applyExamTypeResult = useCallback(
    (updatedIds: number[], examType: string) => {
      const updatedIdSet = new Set(updatedIds);
      setSelectedImages(current => {
        const next = new Map(current);
        updatedIdSet.forEach(imageId => {
          const image = next.get(imageId);
          if (image) {
            next.set(imageId, {
              ...image,
              description: examType,
              has_annotation: false,
              status: 'UPLOADED',
            });
          }
        });
        return next;
      });
    },
    []
  );

  return {
    activeMode,
    selectedIds,
    selectedImages: selectedImageList,
    selectedCount: selectedImages.size,
    activateMode,
    exitMode,
    clearSelection,
    toggleSelection,
    applyExamTypeResult,
  };
}
