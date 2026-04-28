package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared

import androidx.compose.ui.geometry.Offset
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.sqrt

internal data class PelvicGeometry(
    val femoralHeadCenter: Offset?,
    val sacralLeft: Offset,
    val sacralRight: Offset,
    val sacralMidpoint: Offset,
    val sacralNormal: Offset,
)

internal fun pelvicGeometry(points: List<Offset>): PelvicGeometry? {
    if (points.size < 2) return null
    val femoral = if (points.size >= 3) points[0] else null
    val sacralLeft = if (points.size >= 3) points[1] else points[0]
    val sacralRight = if (points.size >= 3) points[2] else points[1]
    val dx = sacralRight.x - sacralLeft.x
    val dy = sacralRight.y - sacralLeft.y
    val length = sqrt(dx * dx + dy * dy)
    if (length == 0f) return null

    return PelvicGeometry(
        femoralHeadCenter = femoral,
        sacralLeft = sacralLeft,
        sacralRight = sacralRight,
        sacralMidpoint = midpoint(sacralLeft, sacralRight),
        sacralNormal = Offset(-dy / length, dx / length),
    )
}

internal fun normalizeAngleToOrthogonalRange(angle: Float): Float {
    var normalized = angle
    while (normalized > 90f) normalized -= 180f
    while (normalized < -90f) normalized += 180f
    return normalized
}

internal fun shortestSweep(start: Float, end: Float): Float {
    var diff = (end - start) % 360f
    if (diff > 180f) diff -= 360f
    if (diff < -180f) diff += 360f
    return diff
}

internal fun angleDegrees(origin: Offset, target: Offset): Float {
    return atan2(target.y - origin.y, target.x - origin.x) * (180f / PI.toFloat())
}

internal fun closestAngle(base: Float, candidates: List<Float>): Float {
    return candidates.minByOrNull { abs(shortestSweep(base, it)) } ?: base
}

internal fun pelvicArcRadius(
    first: Offset,
    second: Offset,
    guideLength: Float,
    inner: Boolean,
): Float {
    val referenceLength = hypot(first.x - second.x, first.y - second.y)
    val baseRadius = maxOf(12f, minOf(36f, referenceLength * 0.35f, guideLength * 0.45f))
    return if (inner) maxOf(9f, baseRadius - 10f) else baseRadius
}

internal fun midpoint(first: Offset, second: Offset): Offset {
    return Offset((first.x + second.x) / 2f, (first.y + second.y) / 2f)
}

internal fun average(points: List<Offset>): Offset {
    return Offset(
        x = points.map { it.x }.average().toFloat(),
        y = points.map { it.y }.average().toFloat(),
    )
}

internal fun extendGuide(
    start: Offset,
    end: Offset,
    distance: Float = 120f,
): Pair<Offset, Offset> {
    val dx = end.x - start.x
    val dy = end.y - start.y
    val length = hypot(dx, dy)
    if (length <= 0f) return start to end
    val ux = dx / length
    val uy = dy / length
    return Offset(start.x - ux * distance, start.y - uy * distance) to
        Offset(end.x + ux * distance, end.y + uy * distance)
}
