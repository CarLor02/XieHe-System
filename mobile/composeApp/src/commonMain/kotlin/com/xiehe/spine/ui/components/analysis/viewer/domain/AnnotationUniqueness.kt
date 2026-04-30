package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolDefinition
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_L4
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L4_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LLD
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PO
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CSS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SVA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T10_L2
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_SLOPE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T2_T5
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T5_T12
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TPA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TTS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationToolByMeasurementType

private val uniqueAnnotationToolIds = setOf(
    // 正位标注：除 Cobb、椎体中心、辅助图形外唯一。
    TOOL_T1_TILT,
    TOOL_CA,
    TOOL_PO,
    TOOL_CSS,
    TOOL_TTS,
    TOOL_LLD,
    TOOL_TS,
    // 侧位标注：除椎体中心、辅助图形外唯一。
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
)

fun getCanonicalAnnotationId(typeOrToolId: String): String {
    getAnnotationTool(typeOrToolId)?.let { return it.id }
    getAnnotationToolByMeasurementType(typeOrToolId)?.let { return it.id }

    return typeOrToolId.trim().lowercase().replace(Regex("\\s+"), "-")
}

fun getCanonicalMeasurementAnnotationId(measurement: AnnotationMeasurement): String {
    val normalizedType = measurement.type.trim().lowercase()

    return when {
        normalizedType == "po" -> TOOL_PO
        normalizedType == "css" -> TOOL_CSS
        normalizedType == "tts" -> TOOL_TTS
        normalizedType == "ts" -> TOOL_TS
        else -> getCanonicalAnnotationId(measurement.type)
    }
}

fun resolveAnnotationToolForMeasurement(
    measurement: AnnotationMeasurement,
): AnnotationToolDefinition? {
    return getAnnotationTool(getCanonicalMeasurementAnnotationId(measurement))
        ?: getAnnotationToolByMeasurementType(measurement.type)
}

fun isUniqueAnnotationTool(toolId: String): Boolean {
    return getCanonicalAnnotationId(toolId) in uniqueAnnotationToolIds
}

fun measurementMatchesTool(
    measurement: AnnotationMeasurement,
    tool: AnnotationToolDefinition,
): Boolean {
    return getCanonicalMeasurementAnnotationId(measurement) == getCanonicalAnnotationId(tool.id)
}

fun hasAnnotationForTool(
    measurements: List<AnnotationMeasurement>,
    tool: AnnotationToolDefinition,
): Boolean {
    return measurements.any { measurement -> measurementMatchesTool(measurement, tool) }
}

fun hasUniqueAnnotationForTool(
    measurements: List<AnnotationMeasurement>,
    tool: AnnotationToolDefinition,
): Boolean {
    return isUniqueAnnotationTool(tool.id) && hasAnnotationForTool(measurements, tool)
}

fun filterUniqueAnnotationDuplicates(
    measurements: List<AnnotationMeasurement>,
): List<AnnotationMeasurement> {
    val seen = mutableSetOf<String>()
    return measurements.filter { measurement ->
        val canonicalId = getCanonicalMeasurementAnnotationId(measurement)
        if (canonicalId !in uniqueAnnotationToolIds) return@filter true
        seen.add(canonicalId)
    }
}
