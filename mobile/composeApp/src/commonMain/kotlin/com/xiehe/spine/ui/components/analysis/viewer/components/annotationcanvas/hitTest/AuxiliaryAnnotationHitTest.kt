package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.hitTest

import androidx.compose.ui.geometry.Offset
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.domain.AnnotationRenderType
import com.xiehe.spine.ui.components.analysis.viewer.domain.calculateSmartTagPosition
import com.xiehe.spine.ui.components.analysis.viewer.domain.formatAuxiliaryTag
import com.xiehe.spine.ui.components.analysis.viewer.domain.isEditableAuxiliaryAnnotation
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveAnnotationRenderType
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveMeasurementTagAnchor
import com.xiehe.spine.ui.components.analysis.viewer.domain.shouldShowAuxiliaryShapeTag
import com.xiehe.spine.ui.components.analysis.viewer.domain.shouldShowMetricTag
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

internal fun hitTestEditableAuxiliaryAnnotation(
    touchImagePoint: MeasurementPoint,
    measurements: List<AnnotationMeasurement>,
    sx: Float,
    sy: Float,
    imageScale: Float,
): String? {
    val touchPoint = touchImagePoint.toCanvasOffset(sx, sy)
    val labelHits = editableAuxiliaryLabelHitAreas(
        measurements = measurements,
        sx = sx,
        sy = sy,
        imageScale = imageScale,
    )
    labelHits.asReversed().firstOrNull { it.contains(touchPoint) }?.let { return it.measurementKey }

    val hitTolerance = 18f / imageScale.coerceAtLeast(0.1f)
    return measurements
        .asReversed()
        .firstOrNull { measurement ->
            isEditableAuxiliaryAnnotation(measurement) &&
                hitTestAuxiliaryShape(
                    measurement = measurement,
                    touchPoint = touchPoint,
                    sx = sx,
                    sy = sy,
                    tolerance = hitTolerance,
                )
        }
        ?.key
}

private fun editableAuxiliaryLabelHitAreas(
    measurements: List<AnnotationMeasurement>,
    sx: Float,
    sy: Float,
    imageScale: Float,
): List<AuxiliaryLabelHitArea> {
    val occupiedLabelPositions = mutableListOf<Offset>()
    val hitAreas = mutableListOf<AuxiliaryLabelHitArea>()

    measurements.forEach { measurement ->
        if (shouldShowMetricTag(measurement)) {
            val tagPosition = calculateSmartTagPosition(
                basePosition = resolveMeasurementTagAnchor(measurement, sx, sy, imageScale),
                occupiedPositions = occupiedLabelPositions,
                imageScale = imageScale,
            )
            occupiedLabelPositions += tagPosition
        }

        if (shouldShowAuxiliaryShapeTag(measurement)) {
            val tagPosition = calculateSmartTagPosition(
                basePosition = resolveMeasurementTagAnchor(measurement, sx, sy, imageScale),
                occupiedPositions = occupiedLabelPositions,
                imageScale = imageScale,
            )
            occupiedLabelPositions += tagPosition

            if (isEditableAuxiliaryAnnotation(measurement)) {
                hitAreas += AuxiliaryLabelHitArea(
                    measurementKey = measurement.key,
                    center = tagPosition,
                    text = formatAuxiliaryTag(measurement),
                    imageScale = imageScale,
                )
            }
        }
    }

    return hitAreas
}

private fun hitTestAuxiliaryShape(
    measurement: AnnotationMeasurement,
    touchPoint: Offset,
    sx: Float,
    sy: Float,
    tolerance: Float,
): Boolean {
    val points = measurement.points.map { it.toCanvasOffset(sx, sy) }
    if (points.size < 2) return false

    return when (resolveAnnotationRenderType(measurement.type, measurement.points.size)) {
        AnnotationRenderType.CIRCLE -> hitCircle(points, touchPoint, tolerance)
        AnnotationRenderType.ELLIPSE -> hitEllipse(points, touchPoint, tolerance)
        AnnotationRenderType.BOX -> hitBox(points, touchPoint, tolerance)
        AnnotationRenderType.ARROW -> pointToSegmentDistance(touchPoint, points[0], points[1]) <= tolerance
        else -> false
    }
}

private fun hitCircle(
    points: List<Offset>,
    touchPoint: Offset,
    tolerance: Float,
): Boolean {
    val center = points[0]
    val radius = distance(center, points[1])
    return distance(center, touchPoint) <= radius + tolerance
}

private fun hitEllipse(
    points: List<Offset>,
    touchPoint: Offset,
    tolerance: Float,
): Boolean {
    val center = points[0]
    val radiusX = abs(points[1].x - center.x).coerceAtLeast(1f)
    val radiusY = abs(points[1].y - center.y).coerceAtLeast(1f)
    val normalizedX = (touchPoint.x - center.x) / (radiusX + tolerance)
    val normalizedY = (touchPoint.y - center.y) / (radiusY + tolerance)
    val normalized = normalizedX * normalizedX + normalizedY * normalizedY
    return normalized <= 1f
}

private fun hitBox(
    points: List<Offset>,
    touchPoint: Offset,
    tolerance: Float,
): Boolean {
    val left = min(points[0].x, points[1].x) - tolerance
    val right = max(points[0].x, points[1].x) + tolerance
    val top = min(points[0].y, points[1].y) - tolerance
    val bottom = max(points[0].y, points[1].y) + tolerance
    return touchPoint.x in left..right && touchPoint.y in top..bottom
}

private data class AuxiliaryLabelHitArea(
    val measurementKey: String,
    val center: Offset,
    val text: String,
    val imageScale: Float,
) {
    fun contains(point: Offset): Boolean {
        val safeScale = imageScale.coerceAtLeast(0.1f)
        val minTouchSize = 44f / safeScale
        val halfWidth = max(text.length * LABEL_FONT_SIZE * 0.34f, minTouchSize / 2f)
        val halfHeight = max(LABEL_FONT_SIZE, minTouchSize / 2f)
        return point.x in (center.x - halfWidth)..(center.x + halfWidth) &&
            point.y in (center.y - halfHeight)..(center.y + halfHeight)
    }
}

private fun MeasurementPoint.toCanvasOffset(
    sx: Float,
    sy: Float,
): Offset = Offset((x * sx).toFloat(), (y * sy).toFloat())

private fun distance(a: Offset, b: Offset): Float = hypot(a.x - b.x, a.y - b.y)

private fun pointToSegmentDistance(
    point: Offset,
    start: Offset,
    end: Offset,
): Float {
    val dx = end.x - start.x
    val dy = end.y - start.y
    val lengthSquared = dx * dx + dy * dy
    if (lengthSquared <= 0f) return distance(point, start)

    val t = (((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared).coerceIn(0f, 1f)
    val projection = Offset(start.x + t * dx, start.y + t * dy)
    val projectionDx = point.x - projection.x
    val projectionDy = point.y - projection.y
    return sqrt(projectionDx * projectionDx + projectionDy * projectionDy)
}

private const val LABEL_FONT_SIZE = 5.5f
