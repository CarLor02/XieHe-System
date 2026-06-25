import type { ImageFile } from '@/services/imageServices/imageFileService';
import type { ImagingViewMode } from '@/app/imaging/domain/imagingFilters';
import type { PreviewLoadState } from '@/app/imaging/features/image-preview/hooks/useImagePreviewQueue';
import ImageEmptyState from './ImageEmptyState';
import ImageGrid from './ImageGrid';
import ImageListRows from './ImageListRows';
import ImagePagination from './ImagePagination';

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
  onMoreAction: (fileId: number, action: string) => void;
  onCropEdit: (imageFile: ImageFile) => void;
  isBatchExportMode?: boolean;
  selectedExportIds?: Set<number>;
  onToggleExportSelection?: (fileId: number) => void;
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
  isBatchExportMode = false,
  selectedExportIds = new Set<number>(),
  onToggleExportSelection,
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
            isBatchExportMode={isBatchExportMode}
            selectedExportIds={selectedExportIds}
            onToggleExportSelection={onToggleExportSelection}
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
            isBatchExportMode={isBatchExportMode}
            selectedExportIds={selectedExportIds}
            onToggleExportSelection={onToggleExportSelection}
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
