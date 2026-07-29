import { useCallback, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import {
  deleteImageFile,
  downloadImageFile,
  renameImageFile,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import type { ImageFileAction } from '../domain/imageFileAction';
import {
  splitImageFilename,
  validateImageBasename,
} from '../domain/imageFilename';

interface UseImageFileActionsOptions {
  imageFiles: ImageFile[];
  reloadImages: () => void | Promise<void>;
  onImageUpdated: (imageFile: ImageFile) => void;
}

export function useImageFileActions({
  imageFiles,
  reloadImages,
  onImageUpdated,
}: UseImageFileActionsOptions) {
  const [renameTarget, setRenameTarget] = useState<ImageFile | null>(null);
  const [renameBasename, setRenameBasename] = useState('');
  const [renameExtension, setRenameExtension] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  const openRenameDialog = useCallback(
    (fileId: number) => {
      const imageFile = imageFiles.find(file => file.id === fileId);
      if (!imageFile) return;

      const { basename, extension } = splitImageFilename(
        imageFile.original_filename
      );
      setRenameTarget(imageFile);
      setRenameBasename(basename);
      setRenameExtension(extension);
      setRenameError(null);
    },
    [imageFiles]
  );

  const closeRenameDialog = useCallback(() => {
    if (renaming) return;
    setRenameTarget(null);
    setRenameBasename('');
    setRenameExtension('');
    setRenameError(null);
  }, [renaming]);

  const handleRenameBasenameChange = useCallback((value: string) => {
    setRenameBasename(value);
    setRenameError(null);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!renameTarget || renaming) return;

    const validationError = validateImageBasename(
      renameBasename,
      renameExtension
    );
    if (validationError) {
      setRenameError(validationError);
      return;
    }

    const basename = renameBasename.trim();
    const currentBasename = splitImageFilename(
      renameTarget.original_filename
    ).basename;
    if (basename === currentBasename) {
      closeRenameDialog();
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      const updatedImage = await renameImageFile(renameTarget.id, basename);
      onImageUpdated(updatedImage);
      setRenameTarget(null);
      setRenameBasename('');
      setRenameExtension('');
      void reloadImages();
    } catch (error: unknown) {
      setRenameError(getErrorMessage(error, '重命名失败，请重试'));
    } finally {
      setRenaming(false);
    }
  }, [
    closeRenameDialog,
    onImageUpdated,
    reloadImages,
    renameBasename,
    renameExtension,
    renameTarget,
    renaming,
  ]);

  const handleMoreAction = useCallback(
    async (fileId: number, action: ImageFileAction) => {
      switch (action) {
        case 'download':
          try {
            const blob = await downloadImageFile(fileId);
            const url = URL.createObjectURL(blob);
            const imageFile = imageFiles.find(file => file.id === fileId);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = imageFile?.original_filename || `image_${fileId}`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
          } catch (error: unknown) {
            console.error('下载失败:', error);
            alert(getErrorMessage(error, '下载失败，请重试'));
          }
          break;
        case 'rename':
          openRenameDialog(fileId);
          break;
        case 'delete':
          if (confirm('确定要删除这个影像吗？此操作不可撤销。')) {
            try {
              await deleteImageFile(fileId);
              reloadImages();
              alert('影像删除成功');
            } catch (error: unknown) {
              console.error('删除影像失败:', error);
              alert(getErrorMessage(error, '删除失败，请重试'));
            }
          }
          break;
        default:
          console.warn(`未知的操作 "${action}"`);
      }
    },
    [imageFiles, openRenameDialog, reloadImages]
  );

  return {
    handleMoreAction,
    renameTarget,
    renameBasename,
    renameExtension,
    renameError,
    renaming,
    handleRenameBasenameChange,
    closeRenameDialog,
    confirmRename,
  };
}
