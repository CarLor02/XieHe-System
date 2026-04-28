package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationHelperSegment
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import com.xiehe.spine.ui.components.analysis.viewer.catalog.ANNOTATION_TOOL_CATALOG
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_ANGLE as VIEWER_TOOL_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ARROW as VIEWER_TOOL_AUX_ARROW
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_BOX as VIEWER_TOOL_AUX_BOX
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_CIRCLE as VIEWER_TOOL_AUX_CIRCLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ELLIPSE as VIEWER_TOOL_AUX_ELLIPSE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_HORIZONTAL_LINE as VIEWER_TOOL_AUX_HORIZONTAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_POLYGON as VIEWER_TOOL_AUX_POLYGON
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_VERTICAL_LINE as VIEWER_TOOL_AUX_VERTICAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AVT as VIEWER_TOOL_AVT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CA as VIEWER_TOOL_CA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_COBB as VIEWER_TOOL_COBB
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_MOVE as VIEWER_TOOL_MOVE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PELVIC as VIEWER_TOOL_PELVIC
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL as VIEWER_TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_STANDARD_DISTANCE as VIEWER_TOOL_STANDARD_DISTANCE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT as VIEWER_TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS as VIEWER_TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_VERTEBRA_CENTER as VIEWER_TOOL_VERTEBRA_CENTER
import com.xiehe.spine.ui.components.analysis.viewer.domain.DEFAULT_STANDARD_DISTANCE_MM
import kotlin.math.roundToInt

typealias AnalysisMeasurementKind = AnnotationMeasurementKind
typealias ImageAnalysisMeasurement = AnnotationMeasurement
typealias AnalysisHelperSegment = AnnotationHelperSegment

val TOOL_MOVE = VIEWER_TOOL_MOVE
val TOOL_T1_TILT = VIEWER_TOOL_T1_TILT
val TOOL_COBB = VIEWER_TOOL_COBB
val TOOL_CA = VIEWER_TOOL_CA
val TOOL_PELVIC = VIEWER_TOOL_PELVIC
val TOOL_SACRAL = VIEWER_TOOL_SACRAL
val TOOL_TS = VIEWER_TOOL_TS
val TOOL_AVT = VIEWER_TOOL_AVT
val TOOL_STANDARD_DISTANCE = VIEWER_TOOL_STANDARD_DISTANCE
val TOOL_VERTEBRA_CENTER = VIEWER_TOOL_VERTEBRA_CENTER
val TOOL_ANGLE = VIEWER_TOOL_ANGLE
val TOOL_AUX_CIRCLE = VIEWER_TOOL_AUX_CIRCLE
val TOOL_AUX_ELLIPSE = VIEWER_TOOL_AUX_ELLIPSE
val TOOL_AUX_BOX = VIEWER_TOOL_AUX_BOX
val TOOL_AUX_ARROW = VIEWER_TOOL_AUX_ARROW
val TOOL_AUX_POLYGON = VIEWER_TOOL_AUX_POLYGON
val TOOL_AUX_HORIZONTAL_LINE = VIEWER_TOOL_AUX_HORIZONTAL_LINE
val TOOL_AUX_VERTICAL_LINE = VIEWER_TOOL_AUX_VERTICAL_LINE

val AnalysisToolsCatalog = ANNOTATION_TOOL_CATALOG

val DEFAULT_STANDARD_DISTANCE_POINTS = listOf(
    MeasurementPoint(x = 0.0, y = 0.0),
    MeasurementPoint(x = 200.0, y = 0.0),
)

val ANALYSIS_POSE_PANEL_ORDER = listOf("CR", "CL", "IR", "IL", "SR", "SL")

data class ImageAnalysisUiState(
    val loading: Boolean = false,
    val saving: Boolean = false,
    val aiRunning: Boolean = false,
    val aiRunningLabel: String? = null,
    val fileId: Int? = null,
    val imageBytes: ByteArray? = null,
    val measurements: List<ImageAnalysisMeasurement> = emptyList(),
    val standardDistanceMm: Double? = DEFAULT_STANDARD_DISTANCE_MM,
    val standardDistancePoints: List<MeasurementPoint> = DEFAULT_STANDARD_DISTANCE_POINTS,
    val standardDistanceInput: String = "100",
    val hiddenMeasurementKeys: Set<String> = emptySet(),
    val reportText: String = "",
    val reportExamType: String = "",
    val reportImageId: String = "",
    val reportPatientId: String = "",
    val reportSavedAt: String = "",
    val reportGeneratedAt: String = "",
    val reportLoading: Boolean = false,
    val reportGenerating: Boolean = false,
    val showReportPanel: Boolean = false,
    val standardDistanceLabel: String = "标准距离 100mm",
    val showToolsPanel: Boolean = false,
    val showSettingsPanel: Boolean = false,
    val resultsExpanded: Boolean = true,
    val activeToolId: String = TOOL_MOVE,
    val pendingPoints: List<MeasurementPoint> = emptyList(),
    val isImageLocked: Boolean = false,
    val zoomPercent: Float = 100f,
    val contrast: Int = 0,
    val brightness: Int = 0,
    val errorMessage: String? = null,
    val bannerMessage: String? = null,
)

fun buildStandardDistanceLabel(valueMm: Double): String {
    val rounded = ((valueMm * 10.0).roundToInt() / 10.0)
    val display = if (rounded % 1.0 == 0.0) rounded.toInt().toString() else rounded.toString()
    return "标准距离 ${display}mm"
}

fun formatStandardDistanceInput(valueMm: Double): String {
    val rounded = ((valueMm * 10.0).roundToInt() / 10.0)
    return if (rounded % 1.0 == 0.0) rounded.toInt().toString() else rounded.toString()
}

fun formatZoomPercent(value: Float): String {
    val rounded = ((value * 10f).roundToInt() / 10f)
    return if (rounded % 1f == 0f) "${rounded.toInt()}%" else "${rounded}%"
}
