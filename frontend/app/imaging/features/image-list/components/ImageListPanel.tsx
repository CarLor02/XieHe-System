import type { ImageFile } from '@/services/imageServices/imageFileService';
import type { ImagingViewMode } from '@/app/imaging/domain/imagingFilters';
import type { PreviewLoadState } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import ImageEmptyState from './ImageEmptyState';
import ImageGrid from './ImageGrid';
import ImageListRows from './ImageListRows';
import ImagePagination from './ImagePagination';
import type { ImageFileAction } from '@/app/imaging/features/image-actions/domain/imageFileAction';
import type { BatchSelectionMode } from '@/app/imaging/features/batch-operations/domain/batch-operation';

interface ImageListPanelProps {
  imageFiles: ImageFile[];
  total: number;
  pageSize: number;
  currentPage: number;
  viewMode: ImagingViewMode;
  viewerReturnTo: string;
  hasActiveFilters: boolean;
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  onPreviewError: (fileId: number) => void;
  onMoreAction: (fileId: number, action: ImageFileAction) => void;
  onCropEdit: (imageFile: ImageFile) => void;
  batchSelectionMode?: BatchSelectionMode | null;
  selectedBatchIds?: Set<number>;
  onToggleBatchSelection?: (fileId: number) => void;
  onClearResultFilters: () => void;
  onChangePage: (updater: (page: number) => number) => void;
}

export default function ImageListPanel({
  imageFiles,
  total,
  pageSize,
  currentPage,
  viewMode,
  viewerReturnTo,
  hasActiveFilters,
  imageUrls,
  previewStates,
  onPreviewError,
  onMoreAction,
  onCropEdit,
  batchSelectionMode = null,
  selectedBatchIds = new Set<number>(),
  onToggleBatchSelection,
  onClearResultFilters,
  onChangePage,
}: ImageListPanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {imageFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <ImageGrid
            imageFiles={imageFiles}
            viewerReturnTo={viewerReturnTo}
            imageUrls={imageUrls}
            previewStates={previewStates}
            onPreviewError={onPreviewError}
            onMoreAction={onMoreAction}
            onCropEdit={onCropEdit}
            batchSelectionMode={batchSelectionMode}
            selectedBatchIds={selectedBatchIds}
            onToggleBatchSelection={onToggleBatchSelection}
          />
        ) : (
          <ImageListRows
            imageFiles={imageFiles}
            viewerReturnTo={viewerReturnTo}
            imageUrls={imageUrls}
            previewStates={previewStates}
            onPreviewError={onPreviewError}
            onMoreAction={onMoreAction}
            onCropEdit={onCropEdit}
            batchSelectionMode={batchSelectionMode}
            selectedBatchIds={selectedBatchIds}
            onToggleBatchSelection={onToggleBatchSelection}
          />
        )
      ) : (
        <ImageEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearResultFilters={onClearResultFilters}
        />
      )}

      <ImagePagination
        total={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onChangePage={onChangePage}
      />
    </div>
  );
}
