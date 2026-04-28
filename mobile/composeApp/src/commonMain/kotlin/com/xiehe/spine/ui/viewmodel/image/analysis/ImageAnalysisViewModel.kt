package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.currentEpochSeconds
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.ai.AiInferenceRepository
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.data.measurement.MeasurementRepository
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolDefinition
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getToolsForExamType
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ImageAnalysisViewModel(
    imageRepository: ImageFileRepository,
    measurementRepository: MeasurementRepository,
    aiInferenceRepository: AiInferenceRepository,
    private val loadImageAnalysisUseCase: LoadImageAnalysisUseCase = LoadImageAnalysisUseCase(
        imageFileRepository = imageRepository,
        measurementRepository = measurementRepository,
    ),
    private val saveMeasurementsUseCase: SaveMeasurementsUseCase = SaveMeasurementsUseCase(measurementRepository),
    private val generateImageReportUseCase: GenerateImageReportUseCase = GenerateImageReportUseCase(measurementRepository),
    private val runAiDetectUseCase: RunAiDetectUseCase = RunAiDetectUseCase(aiInferenceRepository),
    private val importAnnotationsUseCase: ImportAnnotationsUseCase = ImportAnnotationsUseCase(),
    private val exportAnnotationsUseCase: ExportAnnotationsUseCase = ExportAnnotationsUseCase(),
) : BaseViewModel() {
    private val _state = MutableStateFlow(ImageAnalysisUiState())
    val state: StateFlow<ImageAnalysisUiState> = _state.asStateFlow()

    private var manualIdCounter: Long = 0L

    fun load(
        fileId: Int,
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val current = _state.value
        if (current.fileId == fileId && (current.measurements.isNotEmpty() || current.imageBytes != null)) {
            return
        }

        scope.launch {
            _state.update { ImageAnalysisStateReducer.prepareLoad(it, fileId) }
            val outcome = loadImageAnalysisUseCase(
                fileId = fileId,
                session = session,
                onSessionExpired = onSessionExpired,
            )
            onSessionUpdated(outcome.session)
            _state.update { ImageAnalysisStateReducer.applyLoaded(it, outcome) }
        }
    }

    fun refresh(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val fileId = _state.value.fileId ?: return
        _state.update { ImageAnalysisStateReducer.resetForRefresh(it) }
        load(
            fileId = fileId,
            session = session,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    fun clearBanner() {
        _state.update { it.copy(bannerMessage = null) }
    }

    fun toggleResultsExpanded() {
        _state.update { it.copy(resultsExpanded = !it.resultsExpanded) }
    }

    fun toggleMeasurementVisibility(key: String) {
        _state.update { state ->
            state.copy(hiddenMeasurementKeys = MeasurementVisibilityPolicy.toggle(state.hiddenMeasurementKeys, key))
        }
    }

    fun setAllMeasurementsVisible(visible: Boolean) {
        _state.update { state ->
            state.copy(
                hiddenMeasurementKeys = MeasurementVisibilityPolicy.setAllVisible(
                    measurements = state.measurements,
                    visible = visible,
                ),
            )
        }
    }

    fun setComputedMeasurementsVisible(visible: Boolean) {
        _state.update { state ->
            state.copy(
                hiddenMeasurementKeys = MeasurementVisibilityPolicy.setKindVisible(
                    measurements = state.measurements,
                    hiddenKeys = state.hiddenMeasurementKeys,
                    kind = AnalysisMeasurementKind.COMPUTED,
                    visible = visible,
                ),
            )
        }
    }

    fun setDetectedMeasurementsVisible(visible: Boolean) {
        _state.update { state ->
            state.copy(
                hiddenMeasurementKeys = MeasurementVisibilityPolicy.setKindVisible(
                    measurements = state.measurements,
                    hiddenKeys = state.hiddenMeasurementKeys,
                    kind = AnalysisMeasurementKind.DETECTED,
                    visible = visible,
                ),
            )
        }
    }

    fun openReportPanel(
        examType: String,
        patientId: Int?,
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val fileId = _state.value.fileId ?: return
        _state.update { ImageAnalysisStateReducer.openReportPanel(it, fileId, examType, patientId) }
        scope.launch {
            when (
                val outcome = generateImageReportUseCase.loadExistingReport(
                    session = session,
                    fileId = fileId,
                    onSessionExpired = onSessionExpired,
                )
            ) {
                is LoadExistingReportOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        ImageAnalysisStateReducer.applyReportLoaded(
                            state = it,
                            reportText = outcome.reportText,
                            reportSavedAt = outcome.reportSavedAt,
                        )
                    }
                }

                is LoadExistingReportOutcome.Failure -> {
                    _state.update { ImageAnalysisStateReducer.applyReportLoadFailure(it, outcome.message) }
                }

                is LoadExistingReportOutcome.Expired -> {
                    _state.update { ImageAnalysisStateReducer.applyReportLoadFailure(it, null) }
                }
            }
        }
    }

    fun closeReportPanel() {
        _state.update { ImageAnalysisStateReducer.closeReportPanel(it) }
    }

    fun updateReportText(value: String) {
        _state.update { it.copy(reportText = value) }
    }

    fun generateReport(
        session: UserSession,
        examType: String,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val snapshot = _state.value
        scope.launch {
            _state.update { ImageAnalysisStateReducer.startReportGenerating(it) }
            when (
                val outcome = generateImageReportUseCase.generate(
                    session = session,
                    snapshot = snapshot,
                    examType = examType,
                    onSessionExpired = onSessionExpired,
                )
            ) {
                is GenerateImageReportOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        ImageAnalysisStateReducer.applyGeneratedReport(
                            state = it,
                            report = outcome.report,
                            generatedAt = outcome.generatedAt,
                        )
                    }
                }

                is GenerateImageReportOutcome.Invalid -> {
                    _state.update { ImageAnalysisStateReducer.applyReportGenerationFailure(it, outcome.message) }
                }

                is GenerateImageReportOutcome.Failure -> {
                    _state.update { ImageAnalysisStateReducer.applyReportGenerationFailure(it, outcome.message) }
                }

                is GenerateImageReportOutcome.Expired -> {
                    _state.update { ImageAnalysisStateReducer.applyReportGenerationFailure(it, null) }
                }
            }
        }
    }

    fun openToolsPanel() {
        _state.update { it.copy(showToolsPanel = true) }
    }

    fun closeToolsPanel() {
        _state.update { it.copy(showToolsPanel = false) }
    }

    fun openSettingsPanel() {
        _state.update { it.copy(showSettingsPanel = true) }
    }

    fun closeSettingsPanel() {
        _state.update { it.copy(showSettingsPanel = false) }
    }

    fun availableTools(examType: String): List<AnnotationToolDefinition> = getToolsForExamType(examType)

    fun selectTool(toolId: String) {
        val tool = getAnnotationTool(toolId) ?: return
        _state.update {
            it.copy(
                activeToolId = tool.id,
                pendingPoints = emptyList(),
                showToolsPanel = false,
                bannerMessage = "已切换工具：${tool.label}",
            )
        }
    }

    fun clearPendingPoints() {
        _state.update { it.copy(pendingPoints = emptyList()) }
    }

    fun removeMeasurement(key: String) {
        _state.update { current ->
            current.copy(
                measurements = current.measurements.filterNot { it.key == key },
                hiddenMeasurementKeys = current.hiddenMeasurementKeys - key,
                bannerMessage = "已删除标注项",
            )
        }
    }

    fun toggleImageLocked() {
        _state.update { it.copy(isImageLocked = !it.isImageLocked) }
    }

    fun onCanvasTap(point: MeasurementPoint) {
        val snapshot = _state.value
        val tool = getAnnotationTool(snapshot.activeToolId) ?: return
        if (tool.id == TOOL_MOVE) return
        if (tool.id == TOOL_AUX_POLYGON) {
            _state.update { it.copy(pendingPoints = it.pendingPoints + point) }
            return
        }
        val effectivePointsNeeded = ManualMeasurementComposer.effectiveInteractionPoints(
            tool = tool,
            measurements = snapshot.measurements,
        )
        if (effectivePointsNeeded <= 0) return

        val normalizedPoint = CanvasPointNormalizer.normalize(
            toolId = tool.id,
            pendingPoints = snapshot.pendingPoints,
            point = point,
        )
        val nextPoints = snapshot.pendingPoints + normalizedPoint
        if (nextPoints.size < effectivePointsNeeded) {
            _state.update { it.copy(pendingPoints = nextPoints) }
            return
        }

        val batch = ManualMeasurementComposer.buildBatch(
            tool = tool,
            userPoints = nextPoints,
            measurements = snapshot.measurements,
            standardDistanceMm = snapshot.standardDistanceMm,
            standardDistancePoints = snapshot.standardDistancePoints,
            nextMeasurementKey = ::nextManualMeasurementKey,
        )
        if (batch == null) {
            _state.update {
                it.copy(
                    pendingPoints = emptyList(),
                    bannerMessage = "当前工具计算失败，请重试",
                )
            }
            return
        }

        _state.update {
            ImageAnalysisStateReducer.applyMeasurementsAdded(
                state = it,
                measurements = batch.addedMeasurements,
                toolId = tool.id,
                points = batch.finalPoints,
            )
        }
    }

    fun onCanvasDoubleTap() {
        val snapshot = _state.value
        val tool = getAnnotationTool(snapshot.activeToolId) ?: return
        if (!tool.supportsDoubleTapFinish) return
        if (snapshot.pendingPoints.size < 3) {
            _state.update { it.copy(bannerMessage = "Polygon 至少需要 3 个点") }
            return
        }
        val measurement = ManualMeasurementBuilder.build(
            toolId = tool.id,
            points = snapshot.pendingPoints,
            measurementKey = nextManualMeasurementKey(tool.id),
            standardDistanceMm = snapshot.standardDistanceMm,
            standardDistancePoints = snapshot.standardDistancePoints,
        ) ?: return

        _state.update {
            it.copy(
                pendingPoints = emptyList(),
                measurements = it.measurements + measurement,
                hiddenMeasurementKeys = it.hiddenMeasurementKeys - measurement.key,
                bannerMessage = "已新增 Polygon 辅助图形",
            )
        }
    }

    fun exportAnnotationsJson(): String = exportAnnotationsUseCase(_state.value)

    fun importAnnotationsJson(json: String) {
        importAnnotationsUseCase(json)
            .onSuccess { imported ->
                _state.update { ImageAnalysisStateReducer.applyImportedAnnotations(it, imported) }
            }
            .onFailure { error ->
                val message = "导入失败：${error.message ?: "JSON格式错误"}"
                _state.update {
                    it.copy(
                        bannerMessage = message,
                        errorMessage = message,
                    )
                }
            }
    }

    fun adjustZoom(delta: Float) {
        _state.update { it.copy(zoomPercent = (it.zoomPercent + delta).coerceIn(40f, 400f)) }
    }

    fun setZoomPercent(value: Float) {
        _state.update { it.copy(zoomPercent = value.coerceIn(40f, 400f)) }
    }

    fun adjustContrast(delta: Int) {
        _state.update { it.copy(contrast = (it.contrast + delta).coerceIn(-100, 100)) }
    }

    fun adjustBrightness(delta: Int) {
        _state.update { it.copy(brightness = (it.brightness + delta).coerceIn(-100, 100)) }
    }

    fun notifyActionUnavailable(message: String) {
        _state.update { it.copy(bannerMessage = message) }
    }

    fun updateStandardDistanceInput(value: String) {
        val sanitized = value.filterIndexed { index, char ->
            char.isDigit() || (char == '.' && index > 0 && '.' !in value.take(index))
        }
        _state.update { current ->
            val parsed = sanitized.toDoubleOrNull()
            if (parsed != null && parsed > 0.0) {
                current.copy(
                    standardDistanceInput = sanitized,
                    standardDistanceMm = parsed,
                    standardDistanceLabel = buildStandardDistanceLabel(parsed),
                )
            } else {
                current.copy(standardDistanceInput = sanitized)
            }
        }
    }

    fun runAiDetect(
        fileId: Int,
    ) {
        val snapshot = _state.value
        val bytes = snapshot.imageBytes
        if (bytes == null) {
            _state.update { it.copy(bannerMessage = "当前影像尚未加载完成") }
            return
        }

        scope.launch {
            _state.update { ImageAnalysisStateReducer.startAiAction(it, "AI检测与测量中...") }
            when (
                val outcome = runAiDetectUseCase(
                    fileId = fileId,
                    imageBytes = bytes,
                    standardDistanceMm = snapshot.standardDistanceMm,
                    standardDistancePoints = snapshot.standardDistancePoints,
                )
            ) {
                is RunAiDetectOutcome.Success -> {
                    _state.update { ImageAnalysisStateReducer.applyAiSuccess(it, outcome.measurements) }
                }

                is RunAiDetectOutcome.Failure -> {
                    _state.update { ImageAnalysisStateReducer.applyAiFailure(it, outcome.message) }
                }
            }
        }
    }

    fun runAiMeasure(
        fileId: Int,
    ) {
        runAiDetect(fileId = fileId)
    }

    fun clearMeasurements() {
        _state.update {
            it.copy(
                measurements = emptyList(),
                hiddenMeasurementKeys = emptySet(),
                pendingPoints = emptyList(),
                bannerMessage = "已清空当前测量结果",
            )
        }
    }

    fun releaseImageState(fileId: Int) {
        _state.update { current ->
            if (current.fileId != fileId) {
                current
            } else {
                ImageAnalysisStateReducer.releaseRetainedImageState(current)
            }
        }
    }

    fun saveMeasurements(
        session: UserSession,
        examType: String,
        patientId: Int?,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val snapshot = _state.value
        if (snapshot.saving) return

        scope.launch {
            _state.update { ImageAnalysisStateReducer.startSaving(it) }
            when (
                val outcome = saveMeasurementsUseCase(
                    snapshot = snapshot,
                    session = session,
                    examType = examType,
                    patientId = patientId,
                    onSessionExpired = onSessionExpired,
                )
            ) {
                is SaveMeasurementsOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        ImageAnalysisStateReducer.applySaveSuccess(
                            state = it,
                            reportText = outcome.reportText,
                            savedAt = outcome.savedAt,
                        )
                    }
                }

                is SaveMeasurementsOutcome.Invalid -> {
                    _state.update { ImageAnalysisStateReducer.applySaveFailure(it, outcome.message) }
                }

                is SaveMeasurementsOutcome.Failure -> {
                    _state.update { ImageAnalysisStateReducer.applySaveFailure(it, outcome.message) }
                }

                is SaveMeasurementsOutcome.Expired -> {
                    _state.update { ImageAnalysisStateReducer.applySaveFailure(it, null) }
                }
            }
        }
    }

    private fun nextManualMeasurementKey(toolId: String): String {
        manualIdCounter += 1
        return "manual_${toolId}_${currentEpochSeconds()}_${manualIdCounter}"
    }
}
