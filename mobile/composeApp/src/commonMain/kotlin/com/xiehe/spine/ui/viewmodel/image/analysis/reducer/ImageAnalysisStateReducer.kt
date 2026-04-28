package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.domain.DEFAULT_STANDARD_DISTANCE_MM
import com.xiehe.spine.ui.components.analysis.viewer.domain.filterUniqueAnnotationDuplicates

object ImageAnalysisStateReducer {
    fun prepareLoad(
        state: ImageAnalysisUiState,
        fileId: Int,
    ): ImageAnalysisUiState {
        return state.copy(
            loading = true,
            aiRunning = false,
            aiRunningLabel = null,
            fileId = fileId,
            errorMessage = null,
            bannerMessage = null,
            measurements = emptyList(),
            standardDistanceMm = DEFAULT_STANDARD_DISTANCE_MM,
            standardDistancePoints = DEFAULT_STANDARD_DISTANCE_POINTS,
            standardDistanceInput = formatStandardDistanceInput(DEFAULT_STANDARD_DISTANCE_MM),
            hiddenMeasurementKeys = emptySet(),
            activeToolId = TOOL_MOVE,
            pendingPoints = emptyList(),
            isImageLocked = false,
            imageBytes = null,
            reportImageId = fileId.toString(),
            reportSavedAt = "",
            reportGeneratedAt = "",
            reportLoading = false,
            reportGenerating = false,
            showReportPanel = false,
        )
    }

    fun resetForRefresh(state: ImageAnalysisUiState): ImageAnalysisUiState {
        return state.copy(
            fileId = null,
            imageBytes = null,
            measurements = emptyList(),
            standardDistanceMm = DEFAULT_STANDARD_DISTANCE_MM,
            standardDistancePoints = DEFAULT_STANDARD_DISTANCE_POINTS,
            standardDistanceInput = formatStandardDistanceInput(DEFAULT_STANDARD_DISTANCE_MM),
            standardDistanceLabel = buildStandardDistanceLabel(DEFAULT_STANDARD_DISTANCE_MM),
            hiddenMeasurementKeys = emptySet(),
            activeToolId = TOOL_MOVE,
            pendingPoints = emptyList(),
            isImageLocked = false,
            reportSavedAt = "",
            reportGeneratedAt = "",
            reportLoading = false,
            reportGenerating = false,
            showReportPanel = false,
        )
    }

    fun releaseRetainedImageState(state: ImageAnalysisUiState): ImageAnalysisUiState {
        return resetForRefresh(state).copy(
            loading = false,
            saving = false,
            aiRunning = false,
            aiRunningLabel = null,
            reportText = "",
            reportExamType = "",
            reportImageId = "",
            reportPatientId = "",
            bannerMessage = null,
            errorMessage = null,
        )
    }

    fun applyLoaded(
        state: ImageAnalysisUiState,
        outcome: LoadImageAnalysisOutcome,
    ): ImageAnalysisUiState {
        return state.copy(
            loading = false,
            aiRunning = false,
            aiRunningLabel = null,
            fileId = outcome.fileId,
            imageBytes = outcome.imageBytes,
            measurements = filterUniqueAnnotationDuplicates(outcome.measurements),
            standardDistanceMm = outcome.standardDistanceMm,
            standardDistancePoints = outcome.standardDistancePoints,
            standardDistanceInput = formatStandardDistanceInput(outcome.standardDistanceMm),
            hiddenMeasurementKeys = emptySet(),
            activeToolId = TOOL_MOVE,
            pendingPoints = emptyList(),
            isImageLocked = false,
            reportText = outcome.reportText,
            standardDistanceLabel = buildStandardDistanceLabel(outcome.standardDistanceMm),
            reportImageId = outcome.fileId.toString(),
            reportSavedAt = outcome.reportSavedAt,
            reportGeneratedAt = "",
            reportLoading = false,
            reportGenerating = false,
            errorMessage = outcome.errorMessage,
            bannerMessage = outcome.bannerMessage,
        )
    }

    fun openReportPanel(
        state: ImageAnalysisUiState,
        fileId: Int,
        examType: String,
        patientId: Int?,
    ): ImageAnalysisUiState {
        return state.copy(
            showReportPanel = true,
            reportLoading = true,
            reportExamType = examType,
            reportImageId = fileId.toString(),
            reportPatientId = patientId?.toString().orEmpty(),
            reportGeneratedAt = "",
            bannerMessage = null,
            errorMessage = null,
        )
    }

    fun applyReportLoaded(
        state: ImageAnalysisUiState,
        reportText: String,
        reportSavedAt: String,
    ): ImageAnalysisUiState {
        return state.copy(
            reportLoading = false,
            reportText = reportText,
            reportSavedAt = reportSavedAt,
            errorMessage = null,
        )
    }

    fun applyReportLoadFailure(
        state: ImageAnalysisUiState,
        message: String?,
    ): ImageAnalysisUiState {
        return state.copy(
            reportLoading = false,
            reportText = "",
            reportSavedAt = "",
            errorMessage = message,
            bannerMessage = message,
        )
    }

    fun closeReportPanel(state: ImageAnalysisUiState): ImageAnalysisUiState {
        return state.copy(
            showReportPanel = false,
            reportLoading = false,
            reportGenerating = false,
        )
    }

    fun applyImportedAnnotations(
        state: ImageAnalysisUiState,
        imported: ImportedAnnotations,
    ): ImageAnalysisUiState {
        return state.copy(
            measurements = filterUniqueAnnotationDuplicates(imported.measurements),
            standardDistanceMm = imported.standardDistanceMm,
            standardDistancePoints = imported.standardDistancePoints,
            standardDistanceInput = formatStandardDistanceInput(imported.standardDistanceMm),
            standardDistanceLabel = buildStandardDistanceLabel(imported.standardDistanceMm),
            hiddenMeasurementKeys = emptySet(),
            pendingPoints = emptyList(),
            bannerMessage = "导入标注成功，已覆盖当前标注层",
            errorMessage = null,
        )
    }

    fun startAiAction(
        state: ImageAnalysisUiState,
        label: String,
    ): ImageAnalysisUiState {
        return state.copy(
            aiRunning = true,
            aiRunningLabel = label,
            bannerMessage = null,
            errorMessage = null,
        )
    }

    fun applyAiSuccess(
        state: ImageAnalysisUiState,
        measurements: List<ImageAnalysisMeasurement>,
    ): ImageAnalysisUiState {
        return state.copy(
            aiRunning = false,
            aiRunningLabel = null,
            measurements = filterUniqueAnnotationDuplicates(measurements),
            hiddenMeasurementKeys = emptySet(),
            pendingPoints = emptyList(),
            bannerMessage = "AI检测与测量完成，已覆盖当前标注层",
            errorMessage = null,
        )
    }

    fun applyAiFailure(
        state: ImageAnalysisUiState,
        message: String,
    ): ImageAnalysisUiState {
        return state.copy(
            aiRunning = false,
            aiRunningLabel = null,
            bannerMessage = message,
            errorMessage = message,
        )
    }

    fun applyMeasurementsAdded(
        state: ImageAnalysisUiState,
        measurements: List<ImageAnalysisMeasurement>,
        toolId: String,
        points: List<MeasurementPoint>,
    ): ImageAnalysisUiState {
        if (measurements.isEmpty()) return state.copy(pendingPoints = emptyList())
        val primaryMeasurement = measurements.first()
        val autoCompleted = measurements.drop(1)
        val bannerMessage = if (autoCompleted.isEmpty()) {
            "已新增 ${primaryMeasurement.type} 测量"
        } else {
            "已新增 ${primaryMeasurement.type} 测量，并自动补全 ${autoCompleted.joinToString("、") { it.type }}"
        }

        return state.copy(
            pendingPoints = emptyList(),
            measurements = state.measurements + measurements,
            hiddenMeasurementKeys = state.hiddenMeasurementKeys - measurements.map { it.key }.toSet(),
            standardDistancePoints = if (toolId == TOOL_STANDARD_DISTANCE) points else state.standardDistancePoints,
            bannerMessage = bannerMessage,
        )
    }

    fun startSaving(state: ImageAnalysisUiState): ImageAnalysisUiState {
        return state.copy(saving = true, bannerMessage = null, errorMessage = null)
    }

    fun applySaveSuccess(
        state: ImageAnalysisUiState,
        reportText: String,
        savedAt: String,
    ): ImageAnalysisUiState {
        return state.copy(
            saving = false,
            reportText = reportText,
            reportSavedAt = savedAt,
            bannerMessage = "标注保存成功",
            errorMessage = null,
        )
    }

    fun applySaveFailure(
        state: ImageAnalysisUiState,
        message: String?,
    ): ImageAnalysisUiState {
        return state.copy(
            saving = false,
            errorMessage = message,
            bannerMessage = message,
        )
    }

    fun startReportGenerating(state: ImageAnalysisUiState): ImageAnalysisUiState {
        return state.copy(reportGenerating = true, bannerMessage = null, errorMessage = null)
    }

    fun applyGeneratedReport(
        state: ImageAnalysisUiState,
        report: String,
        generatedAt: String,
    ): ImageAnalysisUiState {
        return state.copy(
            reportGenerating = false,
            reportText = report,
            reportGeneratedAt = generatedAt,
            errorMessage = null,
            bannerMessage = "AI报告生成完成",
        )
    }

    fun applyReportGenerationFailure(
        state: ImageAnalysisUiState,
        message: String?,
    ): ImageAnalysisUiState {
        return state.copy(
            reportGenerating = false,
            errorMessage = message,
            bannerMessage = message,
        )
    }
}
