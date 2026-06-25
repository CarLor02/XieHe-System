import { useCallback, useState, type MouseEvent } from 'react';
import { getErrorMessage } from '@/lib/api';
import {
  deleteImageFile,
  downloadImageFile,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

const ACTION_MENU_WIDTH = 160;
const ACTION_MENU_ESTIMATED_HEIGHT = 144;
const ACTION_MENU_VIEWPORT_MARGIN = 8;
const ACTION_MENU_TRIGGER_GAP = 4;

export type OpenDropdown = {
  id: string;
  top: number;
  left: number;
};

interface UseImageFileActionsOptions {
  imageFiles: ImageFile[];
  reloadImages: () => void;
}

export function useImageFileActions({
  imageFiles,
  reloadImages,
}: UseImageFileActionsOptions) {
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown | null>(null);

  const toggleImageActionMenu = useCallback(
    (fileId: number, event: MouseEvent<HTMLButtonElement>) => {
      const dropdownId = fileId.toString();
      if (openDropdown?.id === dropdownId) {
        setOpenDropdown(null);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom;
      const shouldOpenUpward =
        availableBelow <
          ACTION_MENU_ESTIMATED_HEIGHT + ACTION_MENU_TRIGGER_GAP &&
        rect.top > availableBelow;

      const unclampedTop = shouldOpenUpward
        ? rect.top - ACTION_MENU_ESTIMATED_HEIGHT - ACTION_MENU_TRIGGER_GAP
        : rect.bottom + ACTION_MENU_TRIGGER_GAP;
      const top = Math.max(
        ACTION_MENU_VIEWPORT_MARGIN,
        Math.min(
          unclampedTop,
          window.innerHeight -
            ACTION_MENU_ESTIMATED_HEIGHT -
            ACTION_MENU_VIEWPORT_MARGIN
        )
      );
      const left = Math.max(
        ACTION_MENU_VIEWPORT_MARGIN,
        Math.min(
          rect.right - ACTION_MENU_WIDTH,
          window.innerWidth - ACTION_MENU_WIDTH - ACTION_MENU_VIEWPORT_MARGIN
        )
      );

      setOpenDropdown({ id: dropdownId, top, left });
    },
    [openDropdown]
  );

  const handleMoreAction = useCallback(
    async (fileId: number, action: string) => {
      setOpenDropdown(null);

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
    openDropdown,
    setOpenDropdown,
    toggleImageActionMenu,
    handleMoreAction,
  };
}
