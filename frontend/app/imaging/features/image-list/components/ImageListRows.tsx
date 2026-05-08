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
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  onPreviewError: (fileId: number) => void;
  onMoreAction: (fileId: number, action: string) => void;
}

export default function ImageListRows({
  imageFiles,
  imageUrls,
  previewStates,
  onPreviewError,
  onMoreAction,
}: ImageListRowsProps) {
  return (
    <div className="divide-y divide-gray-200">
      {imageFiles.map(imageFile => (
        <div key={imageFile.id} className="p-6 hover:bg-gray-50">
          <div className="flex items-center space-x-4">
            <Link href={`/imaging/viewer?id=${imageFile.id}`}>
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span
                    className="text-lg font-semibold text-gray-900 truncate"
                    title={imageFile.original_filename}
                  >
                    {imageFile.original_filename}
                  </span>
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {imageFile.description || imageFile.file_type}
                  </span>
                </div>
                <ImageStatusBadge status={imageFile.status} variant="inline" />
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                <div>
                  <span className="text-gray-500">上传日期: </span>
                  <span className="font-medium">
                    {formatDate(imageFile.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">文件大小: </span>
                  <span className="font-medium">
                    {formatFileSize(imageFile.file_size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Link
                  href={`/imaging/viewer?id=${imageFile.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2 whitespace-nowrap"
                >
                  <i className="ri-eye-line w-4 h-4 flex items-center justify-center"></i>
                  <span>标注分析</span>
                </Link>
                <button
                  onClick={() => onMoreAction(imageFile.id, 'download')}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center space-x-2 whitespace-nowrap"
                >
                  <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                  <span>下载</span>
                </button>
                <button
                  onClick={() => onMoreAction(imageFile.id, 'delete')}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 text-sm flex items-center space-x-2 whitespace-nowrap"
                >
                  <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                  <span>删除</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
