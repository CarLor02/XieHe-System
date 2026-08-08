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
import BatchImportOverlay from '@/app/imaging/features/batch-import/components/BatchImportOverlay';
import { EXAM_TYPES } from './domain/imagingFilters';
import { AppModal } from '@/components/overlay/overlay-components';
import ImageRenameDialog from './features/image-actions/components/ImageRenameDialog';

function ImagingPageContent() {
  const controller = useImagingPageController();
  const {
    preview,
    actions,
    editOverlay,
    batchSelection,
    batchExport,
    batchExamType,
    batchImport,
  } = controller;
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
        selectedProcessingStatus={controller.selectedProcessingStatus}
        dateFrom={controller.dateFrom}
        dateTo={controller.dateTo}
        viewMode={controller.viewMode}
        canUseUploaderView={controller.canUseUploaderView}
        canUseTeamView={controller.canUseTeamView}
        selectedUploader={controller.selectedUploader}
        selectedTeamIds={controller.selectedTeamIds}
        visibleCount={controller.imageFiles.length}
        total={controller.total}
        activeBatchMode={batchSelection.activeMode}
        selectedBatchCount={batchSelection.selectedCount}
        exportContent={batchExport.exportContent}
        exportContentOptions={batchExport.exportContentOptions}
        isExporting={batchExport.isExporting}
        exportProgress={batchExport.exportProgress}
        exportMessage={batchExport.exportMessage}
        batchExamType={batchExamType.examType}
        isSettingBatchExamType={batchExamType.isSetting}
        batchExamTypeMessage={batchExamType.message}
        isBatchOperationBusy={
          batchExport.isExporting || batchExamType.isSetting
        }
        onChangeSearchTerm={controller.setSearchTerm}
        onSearch={controller.handleSearch}
        onToggleFilters={() =>
          controller.setShowFilters(!controller.showFilters)
        }
        onChangeExamType={controller.setSelectedExamType}
        onChangeProcessingStatus={controller.setSelectedProcessingStatus}
        onChangeDateFrom={controller.setDateFrom}
        onChangeDateTo={controller.setDateTo}
        onChangeViewMode={controller.setViewMode}
        onChangeUploader={controller.handleChangeUploader}
        onChangeTeams={controller.handleChangeTeams}
        onLoadUploaders={controller.loadUploaders}
        onLoadTeams={controller.loadAssignableTeams}
        onClearFilters={controller.clearFilters}
        onSelectBatchOperation={controller.handleSelectBatchOperation}
        onExitBatchMode={controller.exitBatchMode}
        onChangeExportContent={batchExport.setExportContent}
        onClearBatchSelection={batchSelection.clearSelection}
        onStartBatchExport={batchExport.startBatchExport}
        onChangeBatchExamType={batchExamType.setExamType}
        onRequestBatchExamTypeUpdate={batchExamType.requestSet}
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
        onPreviewError={preview.handlePreviewError}
        onMoreAction={actions.handleMoreAction}
        onCropEdit={editOverlay.openEditOverlay}
        batchSelectionMode={batchSelection.activeMode}
        selectedBatchIds={batchSelection.selectedIds}
        onToggleBatchSelection={batchSelection.toggleSelection}
        onClearResultFilters={controller.clearEmptyResultFilters}
        onChangePage={controller.setCurrentPage}
      />

      {editOverlay.editState && (
        <UploadOptionsOverlay
          key={editOverlay.editState.imageFile.id}
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
          loadTeams={controller.loadAssignableTeams}
          onTeamIdsChange={editOverlay.handleTeamIdsChange}
          onExamTypeChange={editOverlay.handleExamTypeChange}
          onFlip={editOverlay.handleFlip}
          onCrop={editOverlay.handleCrop}
          onClose={editOverlay.closeEditOverlay}
          onConfirm={editOverlay.handleConfirm}
          confirmAppliesCrop={false}
        />
      )}

      {batchImport.overlayOpen && (
        <BatchImportOverlay
          activeTab={batchImport.activeTab}
          files={batchImport.files}
          patientId={batchImport.patientId}
          examType={batchImport.examType}
          examTypes={batchImport.examTypes}
          ownershipScope={batchImport.ownershipScope}
          teamIds={batchImport.teamIds}
          lrFlip={batchImport.lrFlip}
          isUploading={batchImport.isUploading}
          message={batchImport.message}
          maxFiles={batchImport.maxFiles}
          batches={batchImport.batches}
          batchPage={batchImport.batchPage}
          batchTotalPages={batchImport.batchTotalPages}
          selectedBatchId={batchImport.selectedBatchId}
          taskItems={batchImport.taskItems}
          itemPage={batchImport.itemPage}
          itemTotalPages={batchImport.itemTotalPages}
          tasksLoading={batchImport.tasksLoading}
          loadTeams={batchImport.loadTeams}
          onTabChange={batchImport.setActiveTab}
          onFileInput={batchImport.handleFileInput}
          onPatientChange={batchImport.setPatientId}
          onExamTypeChange={batchImport.setExamType}
          onOwnershipScopeChange={batchImport.setOwnershipScope}
          onTeamIdsChange={batchImport.setTeamIds}
          onToggleFlip={batchImport.toggleFlip}
          onSelectBatch={batchImport.setSelectedBatchId}
          onChangeBatchPage={batchImport.changeBatchPage}
          onChangeItemPage={batchImport.changeItemPage}
          onRetryTaskItem={batchImport.retryTaskItem}
          onConfirm={batchImport.startImport}
          onClose={batchImport.closeOverlay}
        />
      )}

      <ImagingConfirmDialog
        open={editOverlay.contentResetConfirmOpen}
        message="裁剪上传后的影像后, 影像标注内容会被清空, 是否继续?"
        confirmDisabled={editOverlay.saving}
        onCancel={editOverlay.cancelContentReplacement}
        onConfirm={editOverlay.confirmContentReplacement}
      />

      <ImagingConfirmDialog
        open={batchExamType.confirmOpen}
        message="修改影像类型后，类型实际发生变化的影像标注内容会被清空，是否继续?"
        confirmDisabled={batchExamType.isSetting}
        onCancel={batchExamType.cancelSet}
        onConfirm={batchExamType.confirmSet}
      />

      <ImageRenameDialog
        imageFile={actions.renameTarget}
        basename={actions.renameBasename}
        extension={actions.renameExtension}
        error={actions.renameError}
        saving={actions.renaming}
        onBasenameChange={actions.handleRenameBasenameChange}
        onCancel={actions.closeRenameDialog}
        onConfirm={actions.confirmRename}
      />

      {editOverlay.downloading && (
        <AppModal
          open
          title="正在加载影像"
          contentClassName="fixed inset-0 flex items-center justify-center outline-none"
        >
          <div className="rounded-xl bg-white px-8 py-6 shadow-2xl flex items-center gap-4">
            <i className="ri-loader-4-line text-2xl text-blue-600 animate-spin"></i>
            <span className="text-gray-700">正在加载影像...</span>
          </div>
        </AppModal>
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
