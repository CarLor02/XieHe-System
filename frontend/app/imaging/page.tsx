'use client';

import { Suspense } from 'react';
import { useImagingPageController } from './application/hooks/useImagingPageController';
import ChangeExamTypeModal from './features/image-actions/components/ChangeExamTypeModal';
import ImagingErrorState from './features/image-list/components/ImagingErrorState';
import ImagingFrame from './features/image-list/components/ImagingFrame';
import ImageListPanel from './features/image-list/components/ImageListPanel';
import ImagingLoadingState from './features/image-list/components/ImagingLoadingState';
import ImagingSearchFilters from './features/search-filters/components/ImagingSearchFilters';

function ImagingPageContent() {
  const controller = useImagingPageController();
  const { preview, actions } = controller;

  if (controller.loading) {
    return (
      <ImagingLoadingState
        message={controller.error || '加载影像数据中...'}
      />
    );
  }

  if (controller.error) {
    return (
      <ImagingErrorState
        message={controller.error}
        onRetry={controller.loadImages}
      />
    );
  }

  return (
    <ImagingFrame>
      <ImagingSearchFilters
        searchTerm={controller.searchTerm}
        showFilters={controller.showFilters}
        selectedExamType={controller.selectedExamType}
        selectedReviewStatus={controller.selectedReviewStatus}
        dateFrom={controller.dateFrom}
        dateTo={controller.dateTo}
        viewMode={controller.viewMode}
        visibleCount={controller.imageFiles.length}
        total={controller.total}
        onChangeSearchTerm={controller.setSearchTerm}
        onSearch={controller.handleSearch}
        onToggleFilters={() =>
          controller.setShowFilters(!controller.showFilters)
        }
        onChangeExamType={controller.setSelectedExamType}
        onChangeReviewStatus={controller.setSelectedReviewStatus}
        onChangeDateFrom={controller.setDateFrom}
        onChangeDateTo={controller.setDateTo}
        onChangeViewMode={controller.setViewMode}
        onClearFilters={controller.clearFilters}
      />

      <ImageListPanel
        imageFiles={controller.imageFiles}
        total={controller.total}
        pageSize={controller.pageSize}
        currentPage={controller.currentPage}
        viewMode={controller.viewMode}
        hasActiveFilters={controller.hasActiveFilters}
        imageUrls={preview.imageUrls}
        previewStates={preview.previewStates}
        openDropdown={actions.openDropdown}
        onPreviewError={preview.handlePreviewError}
        onToggleActionMenu={actions.toggleImageActionMenu}
        onMoreAction={actions.handleMoreAction}
        onOpenChangeTypeModal={actions.openChangeTypeModal}
        onClearResultFilters={controller.clearEmptyResultFilters}
        onChangePage={controller.setCurrentPage}
      />

      {actions.openDropdown && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => actions.setOpenDropdown(null)}
        ></div>
      )}

      <ChangeExamTypeModal
        modal={actions.changeTypeModal}
        selectedExamType={actions.changeTypeSelected}
        loading={actions.changeTypeLoading}
        onChangeSelectedExamType={actions.setChangeTypeSelected}
        onClose={() => actions.setChangeTypeModal(null)}
        onConfirm={actions.handleChangeType}
      />
    </ImagingFrame>
  );
}

export default function ImagingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ImagingPageContent />
    </Suspense>
  );
}
