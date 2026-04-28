package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import kotlin.math.abs

internal fun DrawScope.drawAngleArc(
    vertex: Offset,
    startAngleDegrees: Float,
    endAngleDegrees: Float,
    radius: Float,
    color: Color,
) {
    val sweep = shortestSweep(startAngleDegrees, endAngleDegrees)
    if (abs(sweep) < 1f) return
    val path = Path().apply {
        arcTo(
            rect = Rect(
                left = vertex.x - radius,
                top = vertex.y - radius,
                right = vertex.x + radius,
                bottom = vertex.y + radius,
            ),
            startAngleDegrees = startAngleDegrees,
            sweepAngleDegrees = sweep,
            forceMoveTo = true,
        )
    }
    drawPath(path = path, color = color, style = Stroke(width = 1.5f))
}

internal fun DrawScope.drawArrowHead(
    point: Offset,
    color: Color,
    pointingRight: Boolean,
) {
    val direction = if (pointingRight) 1f else -1f
    val path = Path().apply {
        moveTo(point.x, point.y)
        lineTo(point.x + 6f * direction, point.y - 4f)
        lineTo(point.x + 6f * direction, point.y + 4f)
        close()
    }
    drawPath(path = path, color = color, style = Fill)
}

internal fun DrawScope.drawDashedSegment(
    start: Offset,
    end: Offset,
    color: Color,
    strokeWidth: Float,
    dashed: Boolean,
) {
    drawLine(
        color = color,
        start = start,
        end = end,
        strokeWidth = strokeWidth,
        pathEffect = if (dashed) PathEffect.dashPathEffect(floatArrayOf(6f, 4f)) else null,
    )
}

internal fun DrawScope.drawQuadrilateral(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 4) return
    repeat(4) { index ->
        val start = points[index]
        val end = points[(index + 1) % 4]
        drawDashedSegment(start, end, color, 1.4f, dashed = true)
    }
}
