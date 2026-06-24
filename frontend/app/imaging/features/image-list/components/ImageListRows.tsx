import Link from 'next/link';
import {
  formatDate,
  formatFileSize,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import ImagePreview from '@/app/imaging/features/image-preview/components/ImagePreview';
import type { PreviewLoadState } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import ImageStatusBadge from './ImageStatusBadge';

interface ImageListRowsProps {
  imageFiles: ImageFile[];
  viewerReturnTo: string;
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  onPreviewError: (fileId: number) => void;
  onMoreAction: (fileId: number, action: string) => void;
  onCropEdit: (imageFile: ImageFile) => void;
  isBatchExportMode?: boolean;
  selectedExportIds?: Set<number>;
  onToggleExportSelection?: (fileId: number) => void;
}

export default function ImageListRows({
  imageFiles,
  viewerReturnTo,
  imageUrls,
  previewStates,
  onPreviewError,
  onMoreAction,
  onCropEdit,
  isBatchExportMode = false,
  selectedExportIds = new Set<number>(),
  onToggleExportSelection,
}: ImageListRowsProps) {
  return (
    <div className="divide-y divide-gray-200">
      {imageFiles.map(imageFile => {
        const patientName = imageFile.patient_name || '未知患者';
        const uploaderName = imageFile.uploader_name || '未知用户';
        const viewerHref = `/imaging/viewer?id=${imageFile.id}&returnTo=${encodeURIComponent(viewerReturnTo)}`;

        return (
          <div key={imageFile.id} className="p-4 hover:bg-gray-50 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <Link
                href={viewerHref}
                className="self-start"
              >
                <div className="w-16 h-20 bg-black rounded overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center">
                  <ImagePreview
                    imageFile={imageFile}
                    imageUrls={imageUrls}
                    previewStates={previewStates}
                    imgClassName="w-full h-full object-contain"
                    loadingIconClassName="ri-loader-4-line text-2xl animate-spin"
                    fallbackIconClassName="ri-image-line text-2xl"
                    onPreviewError={onPreviewError}
                  />
                </div>
              </Link>

              <div className="min-w-0 w-full flex-1">
                <div className="flex flex-col gap-2 mb-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    <span
                      className="min-w-0 max-w-full text-lg font-semibold text-gray-900 truncate"
                      title={imageFile.original_filename}
                    >
                      {imageFile.original_filename}
                    </span>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded flex-shrink-0">
                      {imageFile.description || '请修改检查类型'}
                    </span>
                  </div>
                  <ImageStatusBadge status={imageFile.status} variant="inline" />
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-gray-600 mb-3 sm:grid-cols-2">
                  <div className="flex justify-between gap-4 min-w-0">
                    <span className="text-gray-500 flex-shrink-0">患者:</span>
                    <span className="font-medium text-right truncate min-w-0" title={patientName}>
                      {patientName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 min-w-0">
                    <span className="text-gray-500 flex-shrink-0">上传者:</span>
                    <span className="font-medium text-right truncate min-w-0" title={uploaderName}>
                      {uploaderName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 min-w-0">
                    <span className="text-gray-500 flex-shrink-0">上传日期:</span>
                    <span className="font-medium text-right">
                      {formatDate(imageFile.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 min-w-0">
                    <span className="text-gray-500 flex-shrink-0">文件大小:</span>
                    <span className="font-medium text-right">
                      {formatFileSize(imageFile.file_size)}
                    </span>
                  </div>
                </div>

                {isBatchExportMode ? (
                  <label
                    className={`flex max-w-xs cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedExportIds.has(imageFile.id)
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">选择导出</span>
                    <input
                      type="checkbox"
                      aria-label={`选择导出 ${imageFile.original_filename}`}
                      checked={selectedExportIds.has(imageFile.id)}
                      onChange={() => onToggleExportSelection?.(imageFile.id)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <Link
                      href={viewerHref}
                      className="bg-blue-600 text-white px-2 py-2 rounded-lg hover:bg-blue-700 text-xs flex items-center justify-center gap-1 whitespace-nowrap sm:px-4 sm:text-sm sm:gap-2"
                    >
                      <i className="ri-eye-line w-4 h-4 flex items-center justify-center"></i>
                      <span>标注分析</span>
                    </Link>
                    <button
                      onClick={() => onMoreAction(imageFile.id, 'download')}
                      className="border border-gray-300 text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-50 text-xs flex items-center justify-center gap-1 whitespace-nowrap sm:px-4 sm:text-sm sm:gap-2"
                    >
                      <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                      <span>下载</span>
                    </button>
                    <button
                      onClick={() => onCropEdit(imageFile)}
                      className="border border-gray-300 text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-50 text-xs flex items-center justify-center gap-1 whitespace-nowrap sm:px-4 sm:text-sm sm:gap-2"
                    >
                      <i className="ri-crop-line w-4 h-4 flex items-center justify-center"></i>
                      <span>裁剪编辑</span>
                    </button>
                    <button
                      onClick={() => onMoreAction(imageFile.id, 'delete')}
                      className="border border-red-300 text-red-600 px-2 py-2 rounded-lg hover:bg-red-50 text-xs flex items-center justify-center gap-1 whitespace-nowrap sm:px-4 sm:text-sm sm:gap-2"
                    >
                      <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                      <span>删除</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
