import type { MouseEvent } from 'react';
import Link from 'next/link';
import {
  formatDate,
  formatFileSize,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import ImagePreview from '@/app/imaging/features/image-preview/components/ImagePreview';
import type { PreviewLoadState } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import ImageActionMenu from '@/app/imaging/features/image-actions/components/ImageActionMenu';
import type { OpenDropdown } from '@/app/imaging/features/image-actions/hooks/useImageFileActions';
import ImageStatusBadge from './ImageStatusBadge';

interface ImageGridProps {
  imageFiles: ImageFile[];
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  openDropdown: OpenDropdown | null;
  onPreviewError: (fileId: number) => void;
  onToggleActionMenu: (fileId: number, event: MouseEvent<HTMLButtonElement>) => void;
  onMoreAction: (fileId: number, action: string) => void;
  onOpenChangeTypeModal: (
    fileId: number,
    currentDesc: string,
    status: string
  ) => void;
  onCropEdit: (imageFile: ImageFile) => void;
}

export default function ImageGrid({
  imageFiles,
  imageUrls,
  previewStates,
  openDropdown,
  onPreviewError,
  onToggleActionMenu,
  onMoreAction,
  onOpenChangeTypeModal,
  onCropEdit,
}: ImageGridProps) {
  return (
    <div className="grid grid-cols-4 gap-6 p-6">
      {imageFiles.map(imageFile => (
        <div
          key={imageFile.id}
          className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <Link href={`/imaging/viewer?id=${imageFile.id}`}>
            <div className="aspect-[3/4] bg-black rounded-t-lg overflow-hidden relative cursor-pointer flex items-center justify-center">
              <ImagePreview
                imageFile={imageFile}
                imageUrls={imageUrls}
                previewStates={previewStates}
                imgClassName="w-full h-full object-contain"
                loadingIconClassName="ri-loader-4-line text-4xl animate-spin"
                fallbackIconClassName="ri-image-line text-4xl"
                onPreviewError={onPreviewError}
              />
              <div className="absolute top-2 right-2">
                <ImageStatusBadge status={imageFile.status} variant="overlay" />
              </div>
            </div>
          </Link>

          <div className="p-4">
            <div className="mb-3">
              <h3
                className="font-semibold text-gray-900 text-lg mb-1 truncate"
                title={imageFile.original_filename}
              >
                {imageFile.original_filename}
              </h3>
              <p className="text-blue-600 font-medium text-sm">
                {imageFile.description || '请修改检查类型'}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>上传日期:</span>
                <span className="font-medium">
                  {formatDate(imageFile.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>文件大小:</span>
                <span className="font-medium">
                  {formatFileSize(imageFile.file_size)}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Link
                href={`/imaging/viewer?id=${imageFile.id}`}
                className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
              >
                标注分析
              </Link>
              <div className="relative">
                <button
                  onClick={event => onToggleActionMenu(imageFile.id, event)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                >
                  更多
                </button>

                <ImageActionMenu
                  imageFileId={imageFile.id}
                  description={imageFile.description ?? ''}
                  status={imageFile.status}
                  openDropdown={openDropdown}
                  onMoreAction={onMoreAction}
                  onOpenChangeTypeModal={onOpenChangeTypeModal}
                  onCropEdit={() => onCropEdit(imageFile)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
