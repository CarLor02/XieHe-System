'use client';

import { useState } from 'react';
import AppDropdown from '@/components/common/AppDropdown';

interface ImageActionMenuProps {
  imageFileId: number;
  onMoreAction: (fileId: number, action: string) => void;
  onCropEdit: () => void;
}

export default function ImageActionMenu({
  imageFileId,
  onMoreAction,
  onCropEdit,
}: ImageActionMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: string) => {
    setOpen(false);
    onMoreAction(imageFileId, action);
  };

  const handleEditInfo = () => {
    setOpen(false);
    onCropEdit();
  };

  return (
    <AppDropdown
      open={open}
      onOpenChange={setOpen}
      align="end"
      sideOffset={4}
      contentClassName="w-40 max-h-[calc(100vh-1rem)] overflow-y-auto"
      trigger={
        <button
          type="button"
          aria-label="更多"
          onClick={() => {
            if (!open) {
              setOpen(true);
            }
          }}
          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
        >
          更多
        </button>
      }
    >
      <div className="py-1">
        <button
          type="button"
          onClick={() => handleAction('download')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
          <span>下载</span>
        </button>
        <div className="border-t border-gray-100"></div>
        <button
          type="button"
          onClick={handleEditInfo}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
          <span>编辑信息</span>
        </button>
        <div className="border-t border-gray-100"></div>
        <button
          type="button"
          onClick={() => handleAction('delete')}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
          <span>删除</span>
        </button>
      </div>
    </AppDropdown>
  );
}
