import type { OpenDropdown } from '../hooks/useImageFileActions';

const MENU_WIDTH = 160;
const MENU_HEIGHT = 180;
const MENU_MARGIN = 8;

interface MenuPositionInput {
  top: number;
  left: number;
  menuWidth?: number;
  menuHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  margin?: number;
}

export function getClampedMenuPosition({
  top,
  left,
  menuWidth = MENU_WIDTH,
  menuHeight = MENU_HEIGHT,
  viewportWidth,
  viewportHeight,
  margin = MENU_MARGIN,
}: MenuPositionInput) {
  const width =
    viewportWidth ?? (typeof window === 'undefined' ? menuWidth : window.innerWidth);
  const height =
    viewportHeight ??
    (typeof window === 'undefined' ? menuHeight : window.innerHeight);
  const maxLeft = Math.max(margin, width - menuWidth - margin);
  const maxTop = Math.max(margin, height - menuHeight - margin);

  return {
    top: Math.min(Math.max(top, margin), maxTop),
    left: Math.min(Math.max(left, margin), maxLeft),
  };
}

interface ImageActionMenuProps {
  imageFileId: number;
  description: string;
  status: string;
  openDropdown: OpenDropdown | null;
  onMoreAction: (fileId: number, action: string) => void;
  onOpenChangeTypeModal: (
    fileId: number,
    currentDesc: string,
    status: string
  ) => void;
  onCropEdit: () => void;
}

export default function ImageActionMenu({
  imageFileId,
  description,
  status,
  openDropdown,
  onMoreAction,
  onOpenChangeTypeModal,
  onCropEdit,
}: ImageActionMenuProps) {
  if (openDropdown?.id !== imageFileId.toString()) return null;

  return (
    <div
      className="fixed w-40 max-h-[calc(100vh-1rem)] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-30"
      style={getClampedMenuPosition({
        top: openDropdown.top,
        left: openDropdown.left,
      })}
    >
      <div className="py-1">
        <button
          onClick={() => onMoreAction(imageFileId, 'download')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
          <span>下载</span>
        </button>
        <div className="border-t border-gray-100"></div>
        <button
          onClick={() => onOpenChangeTypeModal(imageFileId, description, status)}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
          <span>修改类型</span>
        </button>
        <div className="border-t border-gray-100"></div>
        <button
          onClick={onCropEdit}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <i className="ri-crop-line w-4 h-4 flex items-center justify-center"></i>
          <span>裁剪编辑</span>
        </button>
        <div className="border-t border-gray-100"></div>
        <button
          onClick={() => onMoreAction(imageFileId, 'delete')}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
          <span>删除</span>
        </button>
      </div>
    </div>
  );
}
