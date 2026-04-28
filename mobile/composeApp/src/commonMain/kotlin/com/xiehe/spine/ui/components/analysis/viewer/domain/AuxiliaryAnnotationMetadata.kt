package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolSection
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationToolByMeasurementType

private const val GENERATED_AUXILIARY_DESCRIPTION_PREFIX = "辅助图形-"

fun isEditableAuxiliaryAnnotation(measurement: AnnotationMeasurement): Boolean {
    if (!measurement.auxiliary) return false
    return resolveAnnotationRenderType(measurement.type, measurement.points.size) in setOf(
        AnnotationRenderType.CIRCLE,
        AnnotationRenderType.ELLIPSE,
        AnnotationRenderType.BOX,
        AnnotationRenderType.ARROW,
    )
}

fun editableAuxiliaryAnnotationLabel(measurement: AnnotationMeasurement): String {
    val description = measurement.description
    if (description != null) {
        val trimmed = description.trim()
        if (trimmed.isEmpty()) return ""
        if (!trimmed.startsWith(GENERATED_AUXILIARY_DESCRIPTION_PREFIX)) return trimmed
    }

    return formatAuxiliaryTag(measurement)
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
