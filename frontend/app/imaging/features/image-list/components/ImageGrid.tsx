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
  viewerReturnTo: string;
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
  isBatchExportMode?: boolean;
  selectedExportIds?: Set<number>;
  onToggleExportSelection?: (fileId: number) => void;
}

export default function ImageGrid({
  imageFiles,
  viewerReturnTo,
  imageUrls,
  previewStates,
  openDropdown,
  onPreviewError,
  onToggleActionMenu,
  onMoreAction,
  onOpenChangeTypeModal,
  onCropEdit,
  isBatchExportMode = false,
  selectedExportIds = new Set<number>(),
  onToggleExportSelection,
}: ImageGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
      {imageFiles.map(imageFile => {
        const patientName = imageFile.patient_name || '未知患者';
        const uploaderName = imageFile.uploader_name || '未知用户';
        const viewerHref = `/imaging/viewer?id=${imageFile.id}&returnTo=${encodeURIComponent(viewerReturnTo)}`;
        const isSelectedForExport = selectedExportIds.has(imageFile.id);

        return (
          <div
            key={imageFile.id}
            className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {isBatchExportMode ? (
              <button
                type="button"
                aria-label={`选择导出图像 ${imageFile.original_filename}`}
                onClick={() => onToggleExportSelection?.(imageFile.id)}
                className={`block w-full rounded-t-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSelectedForExport ? 'ring-2 ring-blue-500' : ''
                }`}
              >
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
              </button>
            ) : (
              <Link href={viewerHref}>
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
            )}

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
                <div className="flex justify-between gap-4">
                  <span>患者:</span>
                  <span className="font-medium text-right truncate" title={patientName}>
                    {patientName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>上传者:</span>
                  <span className="font-medium text-right truncate" title={uploaderName}>
                    {uploaderName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>上传日期:</span>
                  <span className="font-medium text-right">
                    {formatDate(imageFile.created_at)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>文件大小:</span>
                  <span className="font-medium text-right">
                    {formatFileSize(imageFile.file_size)}
                  </span>
                </div>
              </div>

              {isBatchExportMode ? (
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isSelectedForExport
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">选择导出</span>
                  <input
                    type="checkbox"
                    aria-label={`选择导出 ${imageFile.original_filename}`}
                    checked={isSelectedForExport}
                    onChange={() => onToggleExportSelection?.(imageFile.id)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href={viewerHref}
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
