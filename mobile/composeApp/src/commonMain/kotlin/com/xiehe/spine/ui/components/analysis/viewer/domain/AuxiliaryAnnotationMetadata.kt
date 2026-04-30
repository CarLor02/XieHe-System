package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolSection
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_HORIZONTAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_VERTICAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationToolByMeasurementType

private const val GENERATED_AUXILIARY_DESCRIPTION_PREFIX = "辅助图形-"

private val auxiliaryMeasurementValueTagTypes = setOf(
    TOOL_AUX_LENGTH,
    TOOL_AUX_ANGLE,
    TOOL_AUX_HORIZONTAL_LINE,
    TOOL_AUX_VERTICAL_LINE,
)

private val defaultAuxiliaryMeasurementDescriptions = mapOf(
    TOOL_AUX_LENGTH to "辅助距离测量",
    TOOL_AUX_ANGLE to "辅助角度测量（两条线段夹角）",
    TOOL_AUX_HORIZONTAL_LINE to "辅助水平线段长度测量",
    TOOL_AUX_VERTICAL_LINE to "辅助垂直线段长度测量",
)

fun isEditableAuxiliaryAnnotation(measurement: AnnotationMeasurement): Boolean {
    return measurement.auxiliary || isPersistedAuxiliaryAnnotationType(measurement.type)
}

fun editableAuxiliaryAnnotationLabel(measurement: AnnotationMeasurement): String {
    if (isAuxiliaryMeasurementValueTagType(measurement.type)) {
        return auxiliaryMeasurementValueTagLabel(measurement)
    }

    customAuxiliaryAnnotationLabel(measurement)?.let { return it }

    return formatAuxiliaryTag(measurement)
}

internal fun isAuxiliaryMeasurementValueTagType(type: String): Boolean {
    return type in auxiliaryMeasurementValueTagTypes
}

internal fun auxiliaryMeasurementValueTagLabel(measurement: AnnotationMeasurement): String {
    customAuxiliaryAnnotationLabel(measurement)?.let { return it }

    return getAnnotationToolByMeasurementType(measurement.type)?.label ?: measurement.type
}

private fun customAuxiliaryAnnotationLabel(measurement: AnnotationMeasurement): String? {
    val trimmed = measurement.description?.trim() ?: return null
    if (trimmed.isEmpty()) return null
    if (trimmed.startsWith(GENERATED_AUXILIARY_DESCRIPTION_PREFIX)) return null
    if (
        isAuxiliaryMeasurementValueTagType(measurement.type) &&
        trimmed == defaultAuxiliaryMeasurementDescriptions[measurement.type]
    ) {
        return null
    }

    return trimmed
}

fun normalizeAuxiliaryAnnotationLabelInput(label: String): String {
    return label.trim()
}

fun isPersistedAuxiliaryAnnotationType(type: String): Boolean {
    return getAnnotationToolByMeasurementType(type)?.section == AnnotationToolSection.AUXILIARY
}

internal fun isGeneratedAuxiliaryDescription(value: String): Boolean {
    return value.trim().startsWith(GENERATED_AUXILIARY_DESCRIPTION_PREFIX)
}
