package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.hitTest

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import kotlin.math.hypot

internal data class AnnotationPointDragTarget(
    val measurementKey: String,
    val pointIndex: Int,
)

internal fun findNearestDraggableAnnotationPoint(
    touchImagePoint: MeasurementPoint,
    measurements: List<AnnotationMeasurement>,
    sx: Float,
    sy: Float,
    renderedScale: Float,
): AnnotationPointDragTarget? {
    val hitRadiusPx = 28f
    var bestTarget: AnnotationPointDragTarget? = null
    var bestDistance = hitRadiusPx

    measurements.forEach { measurement ->
        if (measurement.kind != AnnotationMeasurementKind.COMPUTED) return@forEach

        measurement.points.forEachIndexed { pointIndex, point ->
            val dx = ((point.x - touchImagePoint.x) * sx * renderedScale).toFloat()
            val dy = ((point.y - touchImagePoint.y) * sy * renderedScale).toFloat()
            val distance = hypot(dx, dy)
            if (distance <= bestDistance) {
                bestDistance = distance
                bestTarget = AnnotationPointDragTarget(measurement.key, pointIndex)
            }
        }
    }

    return bestTarget
}
