import { useCallback } from 'react';
import { getErrorMessage } from '@/lib/api';
import {
  deleteImageFile,
  downloadImageFile,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

interface UseImageFileActionsOptions {
  imageFiles: ImageFile[];
  reloadImages: () => void;
}

export function useImageFileActions({
  imageFiles,
  reloadImages,
}: UseImageFileActionsOptions) {
  const handleMoreAction = useCallback(
    async (fileId: number, action: string) => {
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
    [imageFiles, reloadImages]
  );

  return {
    handleMoreAction,
  };
}
