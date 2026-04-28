package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.angleDegrees
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawAngleArc
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawDashedSegment

internal fun DrawScope.drawThreePointAngle(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 3) return
    drawLine(color = color, start = points[1], end = points[0], strokeWidth = 2.4f)
    drawLine(color = color, start = points[1], end = points[2], strokeWidth = 2.4f)
    val firstAngle = angleDegrees(points[1], points[0])
    val secondAngle = angleDegrees(points[1], points[2])
    drawAngleArc(points[1], firstAngle, secondAngle, 24f, color)
}

internal fun DrawScope.drawSimpleLine(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 2) return
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
}

internal fun DrawScope.drawSingleHorizontalLine(
    points: List<Offset>,
    color: Color,
) {
    if (points.isEmpty()) return
    if (points.size == 1) {
        drawDashedSegment(
            start = Offset(points[0].x - 40f, points[0].y),
            end = Offset(points[0].x + 40f, points[0].y),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
        return
    }

    drawDashedSegment(points[0], points[1], color, 2f, dashed = true)
}

internal fun DrawScope.drawSingleVerticalLine(
    points: List<Offset>,
    color: Color,
) {
    if (points.isEmpty()) return
    if (points.size == 1) {
        drawDashedSegment(
            start = Offset(points[0].x, points[0].y - 40f),
            end = Offset(points[0].x, points[0].y + 40f),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
        return
    }

    drawDashedSegment(points[0], points[1], color, 2f, dashed = true)
}
