package com.xiehe.spine.ui.components.analysis.viewer.catalog

import com.xiehe.spine.ui.components.icon.shared.IconToken

const val TOOL_MOVE = "move"
const val TOOL_STANDARD_DISTANCE = "standard_distance"

const val TOOL_T1_TILT = "t1-tilt"
const val TOOL_COBB = "cobb"
const val TOOL_CA = "ca"
const val TOOL_PELVIC = "pelvic"
const val TOOL_SACRAL = "sacral"
const val TOOL_AVT = "avt"
const val TOOL_TS = "ts"
const val TOOL_LLD = "lld"
const val TOOL_C7_OFFSET = "c7-offset"

const val TOOL_T1_SLOPE = "t1-slope"
const val TOOL_CL = "cl"
const val TOOL_TK_T2_T5 = "tk-t2-t5"
const val TOOL_TK_T5_T12 = "tk-t5-t12"
const val TOOL_T10_L2 = "t10-l2"
const val TOOL_LL_L1_S1 = "ll-l1-s1"
const val TOOL_LL_L1_L4 = "ll-l1-l4"
const val TOOL_LL_L4_S1 = "ll-l4-s1"
const val TOOL_TPA = "tpa"
const val TOOL_SVA = "sva"
const val TOOL_PI = "pi"
const val TOOL_PT = "pt"
const val TOOL_SS = "ss"

const val TOOL_LENGTH = "length"
const val TOOL_ANGLE = "angle"

const val TOOL_AUX_CIRCLE = "circle"
const val TOOL_AUX_ELLIPSE = "ellipse"
const val TOOL_AUX_BOX = "rectangle"
const val TOOL_AUX_ARROW = "arrow"
const val TOOL_AUX_POLYGON = "polygon"
const val TOOL_VERTEBRA_CENTER = "vertebra-center"
const val TOOL_AUX_LENGTH = "aux-length"
const val TOOL_AUX_ANGLE = "aux-angle"
const val TOOL_AUX_HORIZONTAL_LINE = "aux-horizontal-line"
const val TOOL_AUX_VERTICAL_LINE = "aux-vertical-line"

enum class AnnotationToolSection(val title: String) {
    BASIC("基础模式"),
    MEASURE("测量标注"),
    AUXILIARY("辅助图形"),
}

enum class AnnotationToolColorKey {
    NONE,
    T1_TILT,
    COBB,
    CA,
    PELVIC,
    SACRAL,
    AVT,
    TS,
    LLD,
    C7_OFFSET,
    T1_SLOPE,
    CL,
    TK_T2_T5,
    TK_T5_T12,
    T10_L2,
    LL_L1_S1,
    LL_L1_L4,
    LL_L4_S1,
    TPA,
    SVA,
    PI,
    PT,
    SS,
    LENGTH,
    ANGLE,
    AUXILIARY_CIRCLE,
    AUXILIARY_ELLIPSE,
    AUXILIARY_BOX,
    AUXILIARY_ARROW,
    AUXILIARY_POLYGON,
    VERTEBRA_CENTER,
    AUXILIARY_LENGTH,
    AUXILIARY_ANGLE,
    AUXILIARY_HORIZONTAL_LINE,
    AUXILIARY_VERTICAL_LINE,
}

enum class AnnotationTagAnchorStyle {
    CENTER,
    MIDPOINT_ABOVE,
    AVERAGE_ABOVE,
    AVERAGE_ABOVE_COMPACT,
}

data class AnnotationToolDefinition(
    val id: String,
    val label: String,
    val measurementType: String = label,
    val icon: IconToken,
    val section: AnnotationToolSection,
    val colorKey: AnnotationToolColorKey = AnnotationToolColorKey.NONE,
    val tagAnchorStyle: AnnotationTagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
    val pointsNeeded: Int,
    val interactionPointsNeeded: Int = pointsNeeded,
    val supportsDoubleTapFinish: Boolean = false,
)

val ANNOTATION_TOOL_CATALOG = listOf(
    AnnotationToolDefinition(
        id = TOOL_MOVE,
        label = "移动",
        icon = IconToken.MEASURE_MOVE,
        section = AnnotationToolSection.BASIC,
        colorKey = AnnotationToolColorKey.NONE,
        pointsNeeded = 0,
        interactionPointsNeeded = 0,
    ),
    AnnotationToolDefinition(
        id = TOOL_T1_TILT,
        label = "T1 Tilt",
        icon = IconToken.MEASURE_T1_TILT,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.T1_TILT,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_COBB,
        label = "Cobb",
        icon = IconToken.MEASURE_COBB,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.COBB,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_CA,
        label = "CA",
        icon = IconToken.MEASURE_CA,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.CA,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_PELVIC,
        label = "Pelvic",
        icon = IconToken.MEASURE_PELVIC,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.PELVIC,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_SACRAL,
        label = "Sacral",
        icon = IconToken.MEASURE_SACRAL,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.SACRAL,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AVT,
        label = "AVT",
        icon = IconToken.MEASURE_AVT,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.AVT,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_TS,
        label = "TS",
        icon = IconToken.MEASURE_TS,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.TS,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_LLD,
        label = "LLD",
        icon = IconToken.MEASURE_LLD,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.LLD,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_C7_OFFSET,
        label = "TTS",
        icon = IconToken.MEASURE_C7_OFFSET,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.C7_OFFSET,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE,
        pointsNeeded = 6,
    ),
    AnnotationToolDefinition(
        id = TOOL_T1_SLOPE,
        label = "T1 Slope",
        icon = IconToken.MEASURE_T1_SLOPE,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.T1_SLOPE,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_CL,
        label = "C2-C7 CL",
        icon = IconToken.MEASURE_CL,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.CL,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_TK_T2_T5,
        label = "TK T2-T5",
        icon = IconToken.MEASURE_TK_T2_T5,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.TK_T2_T5,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_TK_T5_T12,
        label = "TK T5-T12",
        icon = IconToken.MEASURE_TK_T5_T12,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.TK_T5_T12,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_T10_L2,
        label = "T10-L2",
        icon = IconToken.MEASURE_T10_L2,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.T10_L2,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_LL_L1_S1,
        label = "LL L1-S1",
        icon = IconToken.MEASURE_LL_L1_S1,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.LL_L1_S1,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_LL_L1_L4,
        label = "LL L1-L4",
        icon = IconToken.MEASURE_LL_L1_L4,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.LL_L1_L4,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_LL_L4_S1,
        label = "LL L4-S1",
        icon = IconToken.MEASURE_LL_L4_S1,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.LL_L4_S1,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_TPA,
        label = "TPA",
        icon = IconToken.MEASURE_TPA,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.TPA,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 7,
    ),
    AnnotationToolDefinition(
        id = TOOL_SVA,
        label = "SVA",
        icon = IconToken.MEASURE_SVA,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.SVA,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE,
        pointsNeeded = 5,
    ),
    AnnotationToolDefinition(
        id = TOOL_PI,
        label = "PI",
        icon = IconToken.MEASURE_PI,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.PI,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 3,
    ),
    AnnotationToolDefinition(
        id = TOOL_PT,
        label = "PT",
        icon = IconToken.MEASURE_PT,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.PT,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 3,
    ),
    AnnotationToolDefinition(
        id = TOOL_SS,
        label = "SS",
        icon = IconToken.MEASURE_SS,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.SS,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_LENGTH,
        label = "长度测量",
        icon = IconToken.MEASURE_DISTANCE,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.LENGTH,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_ANGLE,
        label = "角度测量",
        icon = IconToken.MEASURE_ANGLE,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.ANGLE,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 3,
    ),
    AnnotationToolDefinition(
        id = TOOL_STANDARD_DISTANCE,
        label = "标准距离",
        icon = IconToken.MEASURE_STANDARD_DISTANCE,
        section = AnnotationToolSection.MEASURE,
        colorKey = AnnotationToolColorKey.AUXILIARY_LENGTH,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_CIRCLE,
        label = "Auxiliary Circle",
        icon = IconToken.MEASURE_AUX_CIRCLE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_CIRCLE,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 0,
        interactionPointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_ELLIPSE,
        label = "Auxiliary Ellipse",
        icon = IconToken.MEASURE_AUX_ELLIPSE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_ELLIPSE,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 0,
        interactionPointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_BOX,
        label = "Auxiliary Box",
        icon = IconToken.MEASURE_AUX_BOX,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_BOX,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 0,
        interactionPointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_ARROW,
        label = "Arrow",
        icon = IconToken.MEASURE_AUX_ARROW,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_ARROW,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 0,
        interactionPointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_POLYGON,
        label = "Polygons",
        icon = IconToken.MEASURE_AUX_POLYGON,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_POLYGON,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 0,
        interactionPointsNeeded = 0,
        supportsDoubleTapFinish = true,
    ),
    AnnotationToolDefinition(
        id = TOOL_VERTEBRA_CENTER,
        label = "锥体中心",
        measurementType = "椎体中心",
        icon = IconToken.MEASURE_VERTEBRA_CENTER,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.VERTEBRA_CENTER,
        tagAnchorStyle = AnnotationTagAnchorStyle.CENTER,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_LENGTH,
        label = "距离标注",
        icon = IconToken.MEASURE_DISTANCE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_LENGTH,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_ANGLE,
        label = "角度标注",
        icon = IconToken.MEASURE_ANGLE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_ANGLE,
        tagAnchorStyle = AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT,
        pointsNeeded = 4,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_HORIZONTAL_LINE,
        label = "辅助水平线",
        icon = IconToken.MEASURE_AUX_HORIZONTAL_LINE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_HORIZONTAL_LINE,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
    AnnotationToolDefinition(
        id = TOOL_AUX_VERTICAL_LINE,
        label = "辅助垂直线",
        icon = IconToken.MEASURE_AUX_VERTICAL_LINE,
        section = AnnotationToolSection.AUXILIARY,
        colorKey = AnnotationToolColorKey.AUXILIARY_VERTICAL_LINE,
        tagAnchorStyle = AnnotationTagAnchorStyle.MIDPOINT_ABOVE,
        pointsNeeded = 2,
    ),
)

private val annotationToolMap = ANNOTATION_TOOL_CATALOG.associateBy(AnnotationToolDefinition::id)
private val annotationMeasurementTypeMap = ANNOTATION_TOOL_CATALOG.associateBy(AnnotationToolDefinition::measurementType)
private val annotationMeasurementTypeAliases = mapOf(
    "TS(Trunk Shift)" to TOOL_C7_OFFSET,
)

fun getAnnotationTool(toolId: String): AnnotationToolDefinition? = annotationToolMap[toolId]
fun getAnnotationToolByMeasurementType(type: String): AnnotationToolDefinition? {
    return annotationMeasurementTypeMap[type]
        ?: annotationMeasurementTypeAliases[type]?.let(annotationToolMap::get)
}
