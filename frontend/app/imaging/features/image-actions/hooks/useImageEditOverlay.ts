import { useCallback, useRef, useState } from 'react';
import type {
  CropArea,
  UploadOptionsConfirmOptions,
} from '@/app/upload/_components/overlay/upload-options-overlay';
import {
  downloadImageFile,
  replaceImageFileContent,
  updateImageExamType,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

export const EXAM_TYPES = [
  '正位X光片',
  '侧位X光片',
  '左侧曲位',
  '右侧曲位',
  '体态照片',
];

export interface EditImageState {
  imageFile: ImageFile;
  sourceFile: File;
  currentFile: File;
  sourcePreviewUrl: string;
  previewUrl: string;
  examType: string;
  flipped: boolean;
  cropped: boolean;
}

interface PendingContentReplacement {
  crop: CropArea | null;
}

function renderImageToFile(
  sourceFile: File,
  sourceUrl: string,
  render: (image: HTMLImageElement, canvas: HTMLCanvasElement) => void
): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      render(image, canvas);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('无法生成调整后的影像文件'));
          return;
        }
        resolve(
          new File([blob], sourceFile.name, {
            type: sourceFile.type || 'image/png',
          })
        );
      }, sourceFile.type || 'image/png');
    };
    image.onerror = () => reject(new Error('无法读取待调整的影像文件'));
    image.src = sourceUrl;
  });
}

function renderCropToFile(
  sourceFile: File,
  sourceUrl: string,
  crop: CropArea
): Promise<File> {
  return renderImageToFile(sourceFile, sourceUrl, (image, canvas) => {
    const sourceX = Math.round(crop.x * image.naturalWidth);
    const sourceY = Math.round(crop.y * image.naturalHeight);
    const sourceWidth = Math.max(1, Math.round(crop.width * image.naturalWidth));
    const sourceHeight = Math.max(
      1,
      Math.round(crop.height * image.naturalHeight)
    );
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );
  });
}

function clearLocalAnnotationCache(imageFile: ImageFile) {
  if (typeof window === 'undefined') return;

  const id = imageFile.id.toString();
  const keys = [
    `annotations_${id}`,
    `annotations_IMG${id}`,
    `annotations_IMG${id.padStart(3, '0')}`,
    imageFile.file_uuid ? `annotations_${imageFile.file_uuid}` : null,
  ].filter((key): key is string => Boolean(key));

  for (const key of new Set(keys)) {
    localStorage.removeItem(key);
  }
}

export function useImageEditOverlay({
  reloadImages,
}: {
  reloadImages: () => void;
}) {
  const [editState, setEditState] = useState<EditImageState | null>(null);
  const editStateRef = useRef<EditImageState | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contentResetConfirmOpen, setContentResetConfirmOpen] = useState(false);
  const pendingContentReplacementRef =
    useRef<PendingContentReplacement | null>(null);

  const updateEditState = useCallback(
    (
      updater: (
        previous: EditImageState | null
      ) => EditImageState | null
    ) => {
      const next = updater(editStateRef.current);
      editStateRef.current = next;
      setEditState(next);
    },
    []
  );

  const openEditOverlay = useCallback(async (imageFile: ImageFile) => {
    setDownloading(true);
    setContentResetConfirmOpen(false);
    pendingContentReplacementRef.current = null;
    try {
      const blob = await downloadImageFile(imageFile.id);
      const mimeType = imageFile.mime_type || blob.type || 'image/png';
      const file = new File([blob], imageFile.original_filename, {
        type: mimeType,
      });
      const sourcePreviewUrl = URL.createObjectURL(file);
      const previewUrl = URL.createObjectURL(file);
      const nextState = {
        imageFile,
        sourceFile: file,
        currentFile: file,
        sourcePreviewUrl,
        previewUrl,
        examType: imageFile.description || EXAM_TYPES[0],
        flipped: false,
        cropped: false,
      };
      editStateRef.current = nextState;
      setEditState(nextState);
    } catch {
      alert('无法下载影像文件进行编辑，请重试');
    } finally {
      setDownloading(false);
    }
  }, []);

  const closeEditOverlay = useCallback(() => {
    setContentResetConfirmOpen(false);
    pendingContentReplacementRef.current = null;
    updateEditState(prev => {
      if (prev) {
        URL.revokeObjectURL(prev.sourcePreviewUrl);
        if (prev.previewUrl !== prev.sourcePreviewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
      }
      return null;
    });
  }, [updateEditState]);

  const handleFlip = useCallback(
    async (fileId: string) => {
      const current = editStateRef.current;
      if (!current || current.imageFile.id.toString() !== fileId) return;
      if (!current.sourceFile.type.startsWith('image/')) return;

      const flipRender = (
        image: HTMLImageElement,
        canvas: HTMLCanvasElement
      ) => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0);
      };

      try {
        const nextSourceFile = await renderImageToFile(
          current.sourceFile,
          current.sourcePreviewUrl,
          flipRender
        );
        const nextCurrentFile = current.cropped
          ? await renderImageToFile(
              current.currentFile,
              current.previewUrl,
              flipRender
            )
          : nextSourceFile;
        const nextSourcePreviewUrl = URL.createObjectURL(nextSourceFile);
        const nextPreviewUrl = URL.createObjectURL(nextCurrentFile);
        updateEditState(prev => {
          if (!prev || prev.imageFile.id.toString() !== fileId) {
            URL.revokeObjectURL(nextSourcePreviewUrl);
            URL.revokeObjectURL(nextPreviewUrl);
            return prev;
          }
          URL.revokeObjectURL(prev.sourcePreviewUrl);
          if (prev.previewUrl !== prev.sourcePreviewUrl) {
            URL.revokeObjectURL(prev.previewUrl);
          }
          return {
            ...prev,
            sourceFile: nextSourceFile,
            currentFile: nextCurrentFile,
            sourcePreviewUrl: nextSourcePreviewUrl,
            previewUrl: nextPreviewUrl,
            flipped: !prev.flipped,
          };
        });
      } catch (error) {
        console.error('Flip image error:', error);
      }
    },
    [updateEditState]
  );

  const handleCrop = useCallback(
    async (fileId: string, crop: CropArea) => {
      const current = editStateRef.current;
      if (!current || current.imageFile.id.toString() !== fileId) return;
      if (!current.sourceFile.type.startsWith('image/')) return;

      try {
        const nextFile = await renderCropToFile(
          current.sourceFile,
          current.sourcePreviewUrl,
          crop
        );
        const nextPreviewUrl = URL.createObjectURL(nextFile);
        updateEditState(prev => {
          if (!prev || prev.imageFile.id.toString() !== fileId) {
            URL.revokeObjectURL(nextPreviewUrl);
            return prev;
          }
          if (prev.previewUrl !== prev.sourcePreviewUrl) {
            URL.revokeObjectURL(prev.previewUrl);
          }
          return { ...prev, currentFile: nextFile, previewUrl: nextPreviewUrl, cropped: true };
        });
      } catch (error) {
        console.error('Crop image error:', error);
      }
    },
    [updateEditState]
  );

  const handleExamTypeChange = useCallback((fileId: string, examType: string) => {
    updateEditState(prev =>
      prev && prev.imageFile.id.toString() === fileId
        ? { ...prev, examType }
        : prev
    );
  }, [updateEditState]);

  const handleConfirm = useCallback(async (options?: UploadOptionsConfirmOptions) => {
    const current = editStateRef.current;
    if (!current || saving) return;
    const pendingCrop = options?.pendingCrop ?? null;
    if (pendingCrop || current.cropped || current.flipped) {
      pendingContentReplacementRef.current = { crop: pendingCrop };
      setContentResetConfirmOpen(true);
      return;
    }

    setSaving(true);
    try {
      await updateImageExamType(current.imageFile.id, current.examType);
      closeEditOverlay();
      reloadImages();
    } catch (error) {
      console.error('Failed to save image edit:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [saving, closeEditOverlay, reloadImages]);

  const cancelContentReplacement = useCallback(() => {
    pendingContentReplacementRef.current = null;
    setContentResetConfirmOpen(false);
  }, []);

  const confirmContentReplacement = useCallback(async () => {
    const current = editStateRef.current;
    if (!current || saving) return;

    setSaving(true);
    try {
      const pendingReplacement = pendingContentReplacementRef.current;
      const replacementFile = pendingReplacement?.crop
        ? await renderCropToFile(
            current.sourceFile,
            current.sourcePreviewUrl,
            pendingReplacement.crop
          )
        : current.currentFile;

      await replaceImageFileContent(current.imageFile.id, replacementFile, {
        description: current.examType || null,
      });
      clearLocalAnnotationCache(current.imageFile);
      pendingContentReplacementRef.current = null;
      setContentResetConfirmOpen(false);
      closeEditOverlay();
      reloadImages();
    } catch (error) {
      console.error('Failed to replace image content:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [saving, closeEditOverlay, reloadImages]);

  return {
    editState,
    downloading,
    saving,
    contentResetConfirmOpen,
    openEditOverlay,
    closeEditOverlay,
    handleFlip,
    handleCrop,
    handleExamTypeChange,
    handleConfirm,
    cancelContentReplacement,
    confirmContentReplacement,
  };
}
