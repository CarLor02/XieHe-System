package com.xiehe.spine.ui.components.analysis.viewer

import com.xiehe.spine.data.measurement.MeasurementPoint
import kotlinx.serialization.Serializable

typealias AnnotationPoint = MeasurementPoint

enum class AnnotationMeasurementKind {
    COMPUTED,
    DETECTED,
}

@Serializable
data class AnnotationHelperSegment(
    val start: AnnotationPoint,
    val end: AnnotationPoint,
    val dashed: Boolean = false,
)

data class AnnotationMeasurement(
    val key: String,
    val type: String,
    val value: String,
    val points: List<AnnotationPoint>,
    val description: String? = null,
    val kind: AnnotationMeasurementKind = AnnotationMeasurementKind.COMPUTED,
    val pointLabel: String? = null,
    val confidence: Double? = null,
    val panelVisible: Boolean = true,
    val helperSegments: List<AnnotationHelperSegment> = emptyList(),
    val auxiliary: Boolean = false,
)
