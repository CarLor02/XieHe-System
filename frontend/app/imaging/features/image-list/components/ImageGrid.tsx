import Link from 'next/link';
import {
  formatDate,
  formatFileSize,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import ImagePreview from '@/app/imaging/features/image-preview/components/ImagePreview';
import type { PreviewLoadState } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import ImageActionMenu from '@/app/imaging/features/image-actions/components/ImageActionMenu';
import ImageOwnershipTeamRow from './ImageOwnershipTeamRow';
import ImageStatusBadge from './ImageStatusBadge';
import type { ImageFileAction } from '@/app/imaging/features/image-actions/domain/imageFileAction';
import {
  getBatchSelectionLabel,
  type BatchSelectionMode,
} from '@xiehe/imaging-core/image-files';

interface ImageGridProps {
  imageFiles: ImageFile[];
  viewerReturnTo: string;
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  onPreviewError: (fileId: number) => void;
  onMoreAction: (fileId: number, action: ImageFileAction) => void;
  onCropEdit: (imageFile: ImageFile) => void;
  batchSelectionMode?: BatchSelectionMode | null;
  selectedBatchIds?: Set<number>;
  onToggleBatchSelection?: (fileId: number) => void;
}

export default function ImageGrid({
  imageFiles,
  viewerReturnTo,
  imageUrls,
  previewStates,
  onPreviewError,
  onMoreAction,
  onCropEdit,
  batchSelectionMode = null,
  selectedBatchIds = new Set<number>(),
  onToggleBatchSelection,
}: ImageGridProps) {
  const selectionLabel = batchSelectionMode
    ? getBatchSelectionLabel(batchSelectionMode)
    : '';

  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
      {imageFiles.map(imageFile => {
        const patientName = imageFile.patient_name || '未知患者';
        const uploaderName = imageFile.uploader_name || '未知用户';
        const viewerHref = `/imaging/viewer?id=${imageFile.id}&returnTo=${encodeURIComponent(viewerReturnTo)}`;
        const isSelectedForBatch = selectedBatchIds.has(imageFile.id);

        return (
          <div
            key={imageFile.id}
            className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {batchSelectionMode ? (
              <button
                type="button"
                aria-label={`${selectionLabel}图像 ${imageFile.original_filename}`}
                onClick={() => onToggleBatchSelection?.(imageFile.id)}
                className={`block w-full rounded-t-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isSelectedForBatch ? 'ring-2 ring-blue-500' : ''
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
                    <ImageStatusBadge
                      status={imageFile.status}
                      variant="overlay"
                    />
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
                    <ImageStatusBadge
                      status={imageFile.status}
                      variant="overlay"
                    />
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
                  <span
                    className="font-medium text-right truncate"
                    title={patientName}
                  >
                    {patientName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>上传者:</span>
                  <span
                    className="font-medium text-right truncate"
                    title={uploaderName}
                  >
                    {uploaderName}
                  </span>
                </div>
                <ImageOwnershipTeamRow
                  imageFile={imageFile}
                  rowClassName="flex justify-between gap-4"
                />
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

              {batchSelectionMode ? (
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isSelectedForBatch
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{selectionLabel}</span>
                  <input
                    type="checkbox"
                    aria-label={`${selectionLabel} ${imageFile.original_filename}`}
                    checked={isSelectedForBatch}
                    onChange={() => onToggleBatchSelection?.(imageFile.id)}
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
                  <ImageActionMenu
                    imageFileId={imageFile.id}
                    onMoreAction={onMoreAction}
                    onCropEdit={() => onCropEdit(imageFile)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
