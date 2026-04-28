package com.xiehe.spine.ui.screens.image

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xiehe.spine.currentEpochSeconds
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.ui.components.analysis.viewer.ImageViewer
import com.xiehe.spine.ui.components.analysis.image.AnalysisBottomAction
import com.xiehe.spine.ui.components.analysis.image.AnalysisBottomBar
import com.xiehe.spine.ui.components.analysis.image.AnalysisReportPanel
import com.xiehe.spine.ui.components.analysis.image.AnalysisSettingsPanel
import com.xiehe.spine.ui.components.analysis.image.AuxiliaryAnnotationLabelDialog
import com.xiehe.spine.ui.components.analysis.image.AnalysisTopBar
import com.xiehe.spine.ui.components.analysis.image.MeasureToolPanel
import com.xiehe.spine.ui.components.analysis.image.MeasurementResultsPanel
import com.xiehe.spine.ui.components.analysis.viewer.domain.editableAuxiliaryAnnotationLabel
import com.xiehe.spine.ui.components.analysis.viewer.domain.isEditableAuxiliaryAnnotation
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.form.file.FileSaveResult
import com.xiehe.spine.ui.components.form.file.rememberDownloadedFileSaver
import com.xiehe.spine.ui.components.form.file.rememberJsonFilePickerLauncher
import com.xiehe.spine.ui.components.form.picker.PickerDialog
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.AnalysisMeasurementKind
import com.xiehe.spine.ui.viewmodel.image.ImageAnalysisViewModel
import com.xiehe.spine.ui.viewmodel.image.TOOL_MOVE
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.decodeToImageBitmap

private enum class ImageOverlayPanel {
    TOOLKIT,
    ZOOM,
    MEASUREMENTS,
}

@Composable
fun ImageAnalysisScreen(
    fileId: Int,
    patientId: Int?,
    examType: String,
    vm: ImageAnalysisViewModel,
    session: UserSession,
    onSessionUpdated: (UserSession) -> Unit,
    onBack: () -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()
    val scope = rememberCoroutineScope()
    var showReportGenerateConfirm by remember { mutableStateOf(false) }
    var showClearConfirm by remember { mutableStateOf(false) }
    var activeOverlay by remember { mutableStateOf<ImageOverlayPanel?>(null) }
    var fullscreenMode by remember { mutableStateOf(false) }
    var editingAuxiliaryMeasurementKey by remember { mutableStateOf<String?>(null) }
    val downloadedFileSaver = rememberDownloadedFileSaver()
    val jsonPicker = rememberJsonFilePickerLauncher { localJsonFile ->
        if (localJsonFile == null) {
            vm.notifyActionUnavailable("未选择JSON文件")
        } else {
            vm.importAnnotationsJson(localJsonFile.text)
        }
    }

    LaunchedEffect(fileId, session.accessToken) {
        vm.load(
            fileId = fileId,
            session = session,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    DisposableEffect(fileId) {
        onDispose {
            vm.releaseImageState(fileId)
        }
    }

    LaunchedEffect(state.bannerMessage) {
        if (state.bannerMessage != null) {
            delay(2200)
            vm.clearBanner()
        }
    }

    val imageBitmap = remember(state.imageBytes) {
        state.imageBytes?.let { bytes ->
            runCatching { bytes.decodeToImageBitmap() }.getOrNull()
        }
    }
    val computedMeasurements = remember(state.measurements) {
        state.measurements.filter {
            it.kind == AnalysisMeasurementKind.COMPUTED && it.panelVisible
        }
    }
    val detectedPointFields = remember(state.measurements) {
        state.measurements.filter {
            it.kind == AnalysisMeasurementKind.DETECTED
        }
    }
    val clearEnabled = state.measurements.isNotEmpty() || state.pendingPoints.isNotEmpty()
    val editingAuxiliaryMeasurement = remember(state.measurements, editingAuxiliaryMeasurementKey) {
        state.measurements
            .firstOrNull { it.key == editingAuxiliaryMeasurementKey }
            ?.takeIf { isEditableAuxiliaryAnnotation(it) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        AnimatedVisibility(visible = !fullscreenMode) {
            AnalysisTopBar(
                modifier = Modifier.statusBarsPadding(),
                doctorName = session.username,
                examType = examType,
                fileId = fileId,
                patientId = patientId,
                onBack = onBack,
                onSave = {
                    vm.saveMeasurements(
                        session = session,
                        examType = examType,
                        patientId = patientId,
                        onSessionUpdated = onSessionUpdated,
                        onSessionExpired = onSessionExpired,
                    )
                },
                onImportJson = { jsonPicker.launch() },
                onExportJson = {
                    scope.launch {
                        val payload = vm.exportAnnotationsJson()
                        val filename = "annotations_${fileId}_${currentEpochSeconds()}.json"
                        when (
                            val saveResult = downloadedFileSaver.save(
                                fileName = filename,
                                mimeType = "application/json",
                                bytes = payload.encodeToByteArray(),
                            )
                        ) {
                            is FileSaveResult.Success -> {
                                val location = saveResult.location ?: "下载目录"
                                vm.notifyActionUnavailable("已导出JSON到 $location")
                            }

                            is FileSaveResult.Failure -> {
                                vm.notifyActionUnavailable("导出失败：${saveResult.message}")
                            }
                        }
                    }
                },
            )
        }

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .background(SpineTheme.colors.background),
        ) {
            ImageViewer(
                bitmap = imageBitmap,
                measurements = state.measurements,
                hiddenKeys = state.hiddenMeasurementKeys,
                activeToolId = state.activeToolId,
                pendingPoints = state.pendingPoints,
                isImageLocked = state.isImageLocked,
                zoomPercent = state.zoomPercent,
                contrast = state.contrast,
                brightness = state.brightness,
                onCanvasTap = vm::onCanvasTap,
                onCanvasDoubleTap = vm::onCanvasDoubleTap,
                onMeasurementPointDrag = vm::onMeasurementPointDrag,
                onAuxiliaryAnnotationLongPress = { measurementKey ->
                    activeOverlay = null
                    editingAuxiliaryMeasurementKey = measurementKey
                },
                modifier = Modifier.fillMaxSize(),
            )

            androidx.compose.animation.AnimatedVisibility(
                visible = activeOverlay != null,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth(),
                enter = fadeIn() + slideInVertically { it / 3 },
                exit = fadeOut() + slideOutVertically { it / 3 },
            ) {
                when (activeOverlay) {
                    ImageOverlayPanel.TOOLKIT -> {
                        MeasureToolPanel(
                            tools = vm.availableTools(examType),
                            measurements = state.measurements,
                            activeToolId = state.activeToolId,
                            standardDistanceInput = state.standardDistanceInput,
                            standardDistanceLabel = state.standardDistanceLabel,
                            onSelectTool = { toolId ->
                                vm.selectTool(toolId)
                                activeOverlay = null
                            },
                            onStandardDistanceChange = vm::updateStandardDistanceInput,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    ImageOverlayPanel.ZOOM -> {
                        AnalysisSettingsPanel(
                            zoomPercent = state.zoomPercent,
                            contrast = state.contrast,
                            brightness = state.brightness,
                            onZoomChange = vm::adjustZoom,
                            onZoomSet = vm::setZoomPercent,
                            onContrastChange = vm::adjustContrast,
                            onBrightnessChange = vm::adjustBrightness,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    ImageOverlayPanel.MEASUREMENTS -> {
                        MeasurementResultsPanel(
                            standardDistanceLabel = state.standardDistanceLabel,
                            computedMeasurements = computedMeasurements,
                            detectedPoseFields = detectedPointFields,
                            hiddenKeys = state.hiddenMeasurementKeys,
                            onToggleItemVisibility = vm::toggleMeasurementVisibility,
                            onDeleteItem = vm::removeMeasurement,
                            onShowAll = { vm.setAllMeasurementsVisible(true) },
                            onHideAll = { vm.setAllMeasurementsVisible(false) },
                            onShowComputed = { vm.setComputedMeasurementsVisible(true) },
                            onHideComputed = { vm.setComputedMeasurementsVisible(false) },
                            onShowDetected = { vm.setDetectedMeasurementsVisible(true) },
                            onHideDetected = { vm.setDetectedMeasurementsVisible(false) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    null -> Unit
                }
            }

            AnnotationSideButtons(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .then(if (fullscreenMode) Modifier.statusBarsPadding() else Modifier)
                    .padding(top = 12.dp, end = 8.dp),
                toolkitExpanded = activeOverlay == ImageOverlayPanel.TOOLKIT,
                zoomExpanded = activeOverlay == ImageOverlayPanel.ZOOM,
                fullscreenMode = fullscreenMode,
                measurementsExpanded = activeOverlay == ImageOverlayPanel.MEASUREMENTS,
                onToolkitToggle = {
                    activeOverlay = if (activeOverlay == ImageOverlayPanel.TOOLKIT) {
                        null
                    } else {
                        ImageOverlayPanel.TOOLKIT
                    }
                },
                onZoomToggle = {
                    activeOverlay = if (activeOverlay == ImageOverlayPanel.ZOOM) {
                        null
                    } else {
                        ImageOverlayPanel.ZOOM
                    }
                },
                onFullscreenToggle = {
                    fullscreenMode = !fullscreenMode
                    if (fullscreenMode) {
                        activeOverlay = null
                    }
                },
                onMeasurementsToggle = {
                    activeOverlay = if (activeOverlay == ImageOverlayPanel.MEASUREMENTS) {
                        null
                    } else {
                        ImageOverlayPanel.MEASUREMENTS
                    }
                },
            )

            if (state.loading) {
                LoadingOverlay(message = "...正在加载中")
            } else if (state.aiRunning) {
                LoadingOverlay(message = state.aiRunningLabel ?: "...正在加载中")
            } else if (state.saving) {
                LoadingOverlay(message = "...正在保存标注")
            } else if (state.reportLoading) {
                LoadingOverlay(message = "...正在加载报告")
            } else if (state.reportGenerating) {
                LoadingOverlay(message = "...正在生成报告")
            }

            state.errorMessage?.let {
                Text(
                    text = it,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                        .background(
                            SpineTheme.colors.error.copy(alpha = 0.14f),
                            RoundedCornerShape(12.dp),
                        )
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    style = SpineTheme.typography.caption,
                    color = SpineTheme.colors.error,
                    maxLines = 2,
                )
            }

            val bannerBottomPadding = if (state.errorMessage != null) 56.dp else 12.dp
            state.bannerMessage?.let {
                Text(
                    text = it,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(start = 12.dp, end = 12.dp, bottom = bannerBottomPadding)
                        .background(SpineTheme.colors.surface, RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    style = SpineTheme.typography.caption,
                    color = SpineTheme.colors.textPrimary,
                    maxLines = 2,
                )
            }
        }

        AnalysisBottomBar(
            modifier = Modifier.navigationBarsPadding(),
            moveSelected = state.activeToolId == TOOL_MOVE,
            lockSelected = state.isImageLocked,
            canUndo = true,
            canRedo = true,
            canClear = clearEnabled,
            onAction = { action ->
                when (action) {
                    AnalysisBottomAction.MOVE -> {
                        activeOverlay = null
                        vm.selectTool(TOOL_MOVE)
                    }

                    AnalysisBottomAction.LOCK -> vm.toggleImageLocked()
                    AnalysisBottomAction.UNDO -> vm.notifyActionUnavailable("撤销功能暂未接入")
                    AnalysisBottomAction.REDO -> vm.notifyActionUnavailable("重做功能暂未接入")
                    AnalysisBottomAction.CLEAR -> showClearConfirm = true
                }
            },
        )
    }

    if (state.showReportPanel) {
        PickerDialog(
            title = "",
            onDismissRequest = vm::closeReportPanel,
            showActionRow = false,
            maxDialogWidth = 352.dp,
            maxDialogHeightFraction = 0.68f,
        ) { _ ->
            AnalysisReportPanel(
                examType = state.reportExamType,
                imageId = state.reportImageId,
                patientId = state.reportPatientId,
                savedAt = state.reportSavedAt,
                generatedAt = state.reportGeneratedAt,
                reportText = state.reportText,
                onReportTextChange = vm::updateReportText,
                onGenerateByAi = {
                    showReportGenerateConfirm = true
                },
            )
        }
    }

    editingAuxiliaryMeasurement?.let { measurement ->
        AuxiliaryAnnotationLabelDialog(
            initialLabel = editableAuxiliaryAnnotationLabel(measurement),
            onDismissRequest = { editingAuxiliaryMeasurementKey = null },
            onSave = { label ->
                vm.updateAuxiliaryAnnotationLabel(measurement.key, label)
                editingAuxiliaryMeasurementKey = null
            },
        )
    }

    AppConfirmDialogHost(
        visible = showClearConfirm,
        title = "清除标注",
        message = "确定清除所有标注项吗?",
        confirmText = "清除",
        cancelText = "取消",
        confirmButtonColor = SpineTheme.colors.error,
        cancelButtonColor = SpineTheme.colors.textSecondary,
        confirmTextColor = SpineTheme.colors.onPrimary,
        cancelTextColor = SpineTheme.colors.onPrimary,
        onDismissRequest = { showClearConfirm = false },
        onConfirm = {
            showClearConfirm = false
            vm.clearMeasurements()
        },
    )

    AppConfirmDialogHost(
        visible = showReportGenerateConfirm,
        title = "AI生成报告确认",
        message = "AI生成报告后，现有的填写信息会被覆盖，是否继续?",
        confirmText = "继续",
        cancelText = "取消",
        confirmButtonColor = SpineTheme.colors.primary,
        cancelButtonColor = SpineTheme.colors.textSecondary,
        confirmTextColor = SpineTheme.colors.onPrimary,
        cancelTextColor = SpineTheme.colors.onPrimary,
        onDismissRequest = { showReportGenerateConfirm = false },
        onConfirm = {
            showReportGenerateConfirm = false
            scope.launch {
                vm.generateReport(
                    session = session,
                    examType = examType,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                )
            }
        },
    )

}

@Composable
private fun AnnotationSideButtons(
    toolkitExpanded: Boolean,
    zoomExpanded: Boolean,
    fullscreenMode: Boolean,
    measurementsExpanded: Boolean,
    onToolkitToggle: () -> Unit,
    onZoomToggle: () -> Unit,
    onFullscreenToggle: () -> Unit,
    onMeasurementsToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AnnotationSideButton(
            icon = IconToken.MEASURE_TOGGLE_TOOLKIT,
            active = toolkitExpanded,
            onClick = onToolkitToggle,
        )
        AnnotationSideButton(
            icon = IconToken.MEASURE_ZOOM,
            active = zoomExpanded,
            onClick = onZoomToggle,
        )
        AnnotationSideButton(
            icon = IconToken.MEASURE_TO_FULLSCREEN,
            active = fullscreenMode,
            onClick = onFullscreenToggle,
        )
        AnnotationSideButton(
            icon = IconToken.MEASURE_TOGGLE_MEASURE_LIST,
            active = measurementsExpanded,
            onClick = onMeasurementsToggle,
        )
    }
}

@Composable
private fun AnnotationSideButton(
    icon: IconToken,
    active: Boolean,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .size(36.dp)
            .background(
                color = if (active) colors.primary else colors.surface,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(
            glyph = icon,
            tint = if (active) colors.onPrimary else colors.textSecondary,
            modifier = Modifier.size(14.dp),
        )
    }
}
