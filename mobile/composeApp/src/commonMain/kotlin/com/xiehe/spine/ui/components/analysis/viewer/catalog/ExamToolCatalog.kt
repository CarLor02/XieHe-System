package com.xiehe.spine.ui.components.analysis.viewer.catalog

import com.xiehe.spine.data.image.ImageCategory

private val commonMeasurementToolIds = listOf(
    TOOL_AUX_CIRCLE,
    TOOL_AUX_ELLIPSE,
    TOOL_AUX_BOX,
    TOOL_AUX_ARROW,
    TOOL_AUX_POLYGON,
    TOOL_VERTEBRA_CENTER,
    TOOL_AUX_LENGTH,
    TOOL_AUX_ANGLE,
    TOOL_AUX_HORIZONTAL_LINE,
    TOOL_AUX_VERTICAL_LINE,
)

private fun mapToolIdsToCatalog(toolIds: List<String>): List<AnnotationToolDefinition> {
    return toolIds.mapNotNull(::getAnnotationTool)
}

fun getAnteriorTools(): List<AnnotationToolDefinition> {
    return mapToolIdsToCatalog(
        listOf(
            TOOL_T1_TILT,
            TOOL_COBB,
            TOOL_CA,
            TOOL_PELVIC,
            TOOL_SACRAL,
            TOOL_AVT,
            TOOL_TS,
            TOOL_LLD,
            TOOL_C7_OFFSET,
        ) + commonMeasurementToolIds,
    )
}

fun getLateralTools(): List<AnnotationToolDefinition> {
    return mapToolIdsToCatalog(
        listOf(
            TOOL_T1_SLOPE,
            TOOL_CL,
            TOOL_TK_T2_T5,
            TOOL_TK_T5_T12,
            TOOL_T10_L2,
            TOOL_LL_L1_S1,
            TOOL_LL_L1_L4,
            TOOL_LL_L4_S1,
            TOOL_TPA,
            TOOL_SVA,
            TOOL_PI,
            TOOL_PT,
            TOOL_SS,
        ) + commonMeasurementToolIds,
    )
}

fun getGenericTools(): List<AnnotationToolDefinition> {
    return mapToolIdsToCatalog(
        listOf(
            TOOL_LENGTH,
            TOOL_ANGLE,
            TOOL_AUX_CIRCLE,
            TOOL_AUX_ELLIPSE,
            TOOL_AUX_BOX,
            TOOL_AUX_ARROW,
            TOOL_AUX_POLYGON,
            TOOL_VERTEBRA_CENTER,
            TOOL_AUX_LENGTH,
            TOOL_AUX_ANGLE,
            TOOL_AUX_HORIZONTAL_LINE,
            TOOL_AUX_VERTICAL_LINE,
        ),
    )
}

fun getToolsForExamType(examType: String): List<AnnotationToolDefinition> {
    return when (ImageCategory.fromRaw(examType) ?: ImageCategory.fromLabel(examType)) {
        ImageCategory.FRONT -> getAnteriorTools()
        ImageCategory.SIDE -> getLateralTools()
        ImageCategory.POSTURE_PHOTO,
        ImageCategory.LEFT_BENDING,
        ImageCategory.RIGHT_BENDING,
        null,
        -> getGenericTools()
    }
}
