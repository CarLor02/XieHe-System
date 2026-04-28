package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolDefinition
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LLD
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PELVIC
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationToolByMeasurementType

private val uniqueAnnotationToolIds = setOf(
    TOOL_T1_TILT,
    TOOL_CA,
    TOOL_PELVIC,
    TOOL_SACRAL,
    TOOL_TS,
    TOOL_LLD,
    TOOL_C7_OFFSET,
)

fun getCanonicalAnnotationId(typeOrToolId: String): String {
    getAnnotationTool(typeOrToolId)?.let { return it.id }
    getAnnotationToolByMeasurementType(typeOrToolId)?.let { return it.id }

    return when (typeOrToolId.trim().lowercase().replace(Regex("\\s+"), "-")) {
        "po" -> TOOL_PELVIC
        "css" -> TOOL_SACRAL
        else -> typeOrToolId.trim().lowercase().replace(Regex("\\s+"), "-")
    }
}

fun getCanonicalMeasurementAnnotationId(measurement: AnnotationMeasurement): String {
    val normalizedType = measurement.type.trim().lowercase()
    val pointsCount = measurement.points.size

    return when {
        normalizedType == "po" -> TOOL_PELVIC
        normalizedType == "css" -> TOOL_SACRAL
        normalizedType == "pelvic" -> TOOL_PELVIC
        normalizedType == "sacral" -> TOOL_SACRAL
        normalizedType == "tts" && pointsCount >= 6 -> TOOL_C7_OFFSET
        normalizedType == "tts" -> TOOL_TS
        normalizedType == "ts" && pointsCount >= 6 -> TOOL_C7_OFFSET
        normalizedType == "ts" -> TOOL_TS
        normalizedType == "ts(trunk shift)" -> TOOL_C7_OFFSET
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
