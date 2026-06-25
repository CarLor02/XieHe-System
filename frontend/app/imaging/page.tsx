'use client';

import { Suspense } from 'react';
import { useImagingPageController } from './application/hooks/useImagingPageController';
import ImagingErrorState from './features/image-list/components/ImagingErrorState';
import ImagingFrame from './features/image-list/components/ImagingFrame';
import ImageListPanel from './features/image-list/components/ImageListPanel';
import ImagingLoadingState from './features/image-list/components/ImagingLoadingState';
import ImagingSearchFilters from './features/search-filters/components/ImagingSearchFilters';
import ImagingConfirmDialog from './shared/components/ImagingConfirmDialog';
import UploadOptionsOverlay from '@/app/upload/_components/overlay/upload-options-overlay';
import { EXAM_TYPES } from './features/image-actions/hooks/useImageEditOverlay';

function ImagingPageContent() {
  const controller = useImagingPageController();
  const { preview, actions, editOverlay, batchExport } = controller;
  const isBlockingError =
    Boolean(controller.error) && controller.imageFiles.length === 0;

  if (controller.initialLoading) {
    return (
      <ImagingLoadingState
        message={controller.error || '加载影像数据中...'}
      />
    );
  }

  if (isBlockingError) {
    return (
      <ImagingErrorState
        message={controller.error || '加载影像失败，请重试'}
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
        canUseUploaderView={controller.canUseUploaderView}
        canUseTeamView={controller.canUseTeamView}
        selectedUploader={controller.selectedUploader}
        selectedTeamIds={controller.selectedTeamIds}
        teamOptions={controller.myTeams}
        visibleCount={controller.imageFiles.length}
        total={controller.total}
        isBatchExportMode={batchExport.isBatchExportMode}
        selectedExportCount={batchExport.selectedExportCount}
        exportContent={batchExport.exportContent}
        exportContentOptions={batchExport.exportContentOptions}
        isExporting={batchExport.isExporting}
        exportProgress={batchExport.exportProgress}
        exportMessage={batchExport.exportMessage}
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
        onChangeUploader={controller.handleChangeUploader}
        onChangeTeams={controller.handleChangeTeams}
        onLoadUploaders={controller.loadUploaders}
        onClearFilters={controller.clearFilters}
        onToggleBatchExportMode={batchExport.toggleBatchExportMode}
        onExitBatchExportMode={batchExport.exitBatchExportMode}
        onChangeExportContent={batchExport.setExportContent}
        onClearExportSelection={batchExport.clearExportSelection}
        onStartBatchExport={batchExport.startBatchExport}
      />

      <ImageListPanel
        imageFiles={controller.imageFiles}
        total={controller.total}
        pageSize={controller.pageSize}
        currentPage={controller.currentPage}
        viewMode={controller.viewMode}
        viewerReturnTo={controller.currentImagingHref}
        hasActiveFilters={controller.hasActiveFilters}
        imageUrls={preview.imageUrls}
        previewStates={preview.previewStates}
        openDropdown={actions.openDropdown}
        onPreviewError={preview.handlePreviewError}
        onToggleActionMenu={actions.toggleImageActionMenu}
        onMoreAction={actions.handleMoreAction}
        onCropEdit={editOverlay.openEditOverlay}
        isBatchExportMode={batchExport.isBatchExportMode}
        selectedExportIds={batchExport.selectedExportIds}
        onToggleExportSelection={batchExport.toggleExportSelection}
        onClearResultFilters={controller.clearEmptyResultFilters}
        onChangePage={controller.setCurrentPage}
      />

      {actions.openDropdown && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => actions.setOpenDropdown(null)}
        ></div>
      )}

      {editOverlay.editState && (
        <UploadOptionsOverlay
          file={{
            id: editOverlay.editState.imageFile.id.toString(),
            name: editOverlay.editState.imageFile.original_filename,
            previewUrl: editOverlay.editState.sourcePreviewUrl,
            examType: editOverlay.editState.examType,
            flipped: editOverlay.editState.flipped,
            cropped: editOverlay.editState.cropped,
            mimeType:
              editOverlay.editState.imageFile.mime_type ||
              editOverlay.editState.sourceFile.type ||
              'image/png',
          }}
          examTypes={EXAM_TYPES}
          teamIds={editOverlay.editState.teamIds}
          teamOptions={controller.myTeams}
          onTeamIdsChange={editOverlay.handleTeamIdsChange}
          onExamTypeChange={editOverlay.handleExamTypeChange}
          onFlip={editOverlay.handleFlip}
          onCrop={editOverlay.handleCrop}
          onClose={editOverlay.closeEditOverlay}
          onConfirm={editOverlay.handleConfirm}
          confirmAppliesCrop={false}
        />
      )}

      <ImagingConfirmDialog
        open={editOverlay.contentResetConfirmOpen}
        message="裁剪上传后的影像后, 影像标注内容会被清空, 是否继续?"
        confirmDisabled={editOverlay.saving}
        onCancel={editOverlay.cancelContentReplacement}
        onConfirm={editOverlay.confirmContentReplacement}
      />

      {editOverlay.downloading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45">
          <div className="rounded-xl bg-white px-8 py-6 shadow-2xl flex items-center gap-4">
            <i className="ri-loader-4-line text-2xl text-blue-600 animate-spin"></i>
            <span className="text-gray-700">正在加载影像...</span>
          </div>
        </div>
      )}
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
