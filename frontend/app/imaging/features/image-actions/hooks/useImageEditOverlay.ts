import { useCallback, useState } from 'react';
import type { CropArea } from '@/app/upload/_components/overlay/upload-options-overlay';
import {
  downloadImageFile,
  deleteImageFile,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import { uploadSingleFile } from '@/services/imageServices/uploadService';

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

export function useImageEditOverlay({
  reloadImages,
}: {
  reloadImages: () => void;
}) {
  const [editState, setEditState] = useState<EditImageState | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditOverlay = useCallback(async (imageFile: ImageFile) => {
    setDownloading(true);
    try {
      const blob = await downloadImageFile(imageFile.id);
      const mimeType = imageFile.mime_type || blob.type || 'image/png';
      const file = new File([blob], imageFile.original_filename, {
        type: mimeType,
      });
      const sourcePreviewUrl = URL.createObjectURL(file);
      const previewUrl = URL.createObjectURL(file);
      setEditState({
        imageFile,
        sourceFile: file,
        currentFile: file,
        sourcePreviewUrl,
        previewUrl,
        examType: imageFile.description || EXAM_TYPES[0],
        flipped: false,
        cropped: false,
      });
    } catch {
      alert('无法下载影像文件进行编辑，请重试');
    } finally {
      setDownloading(false);
    }
  }, []);

  const closeEditOverlay = useCallback(() => {
    setEditState(prev => {
      if (prev) {
        URL.revokeObjectURL(prev.sourcePreviewUrl);
        if (prev.previewUrl !== prev.sourcePreviewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
      }
      return null;
    });
  }, []);

  const handleFlip = useCallback(
    async (fileId: string) => {
      if (!editState || editState.imageFile.id.toString() !== fileId) return;
      if (!editState.sourceFile.type.startsWith('image/')) return;

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
          editState.sourceFile,
          editState.sourcePreviewUrl,
          flipRender
        );
        const nextCurrentFile = editState.cropped
          ? await renderImageToFile(
              editState.currentFile,
              editState.previewUrl,
              flipRender
            )
          : nextSourceFile;
        const nextSourcePreviewUrl = URL.createObjectURL(nextSourceFile);
        const nextPreviewUrl = URL.createObjectURL(nextCurrentFile);
        setEditState(prev => {
          if (!prev) return null;
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
    [editState]
  );

  const handleCrop = useCallback(
    async (fileId: string, crop: CropArea) => {
      if (!editState || editState.imageFile.id.toString() !== fileId) return;
      if (!editState.sourceFile.type.startsWith('image/')) return;

      try {
        const nextFile = await renderImageToFile(
          editState.sourceFile,
          editState.sourcePreviewUrl,
          (image, canvas) => {
            const sourceX = Math.round(crop.x * image.naturalWidth);
            const sourceY = Math.round(crop.y * image.naturalHeight);
            const sourceWidth = Math.max(
              1,
              Math.round(crop.width * image.naturalWidth)
            );
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
          }
        );
        const nextPreviewUrl = URL.createObjectURL(nextFile);
        setEditState(prev => {
          if (!prev) return null;
          if (prev.previewUrl !== prev.sourcePreviewUrl) {
            URL.revokeObjectURL(prev.previewUrl);
          }
          return { ...prev, currentFile: nextFile, previewUrl: nextPreviewUrl, cropped: true };
        });
      } catch (error) {
        console.error('Crop image error:', error);
      }
    },
    [editState]
  );

  const handleExamTypeChange = useCallback((fileId: string, examType: string) => {
    setEditState(prev =>
      prev && prev.imageFile.id.toString() === fileId
        ? { ...prev, examType }
        : prev
    );
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!editState || saving) return;
    setSaving(true);
    try {
      await uploadSingleFile({
        file: editState.currentFile,
        patient_id: editState.imageFile.patient_id?.toString() ?? null,
        description: editState.examType || null,
      });
      await deleteImageFile(editState.imageFile.id);
      closeEditOverlay();
      reloadImages();
    } catch (error) {
      console.error('Failed to save edited image:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [editState, saving, closeEditOverlay, reloadImages]);

  return {
    editState,
    downloading,
    saving,
    openEditOverlay,
    closeEditOverlay,
    handleFlip,
    handleCrop,
    handleExamTypeChange,
    handleConfirm,
  };
}
