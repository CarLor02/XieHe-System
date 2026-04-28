package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.angleDegrees
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.average
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.closestAngle
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawAngleArc
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawArrowHead
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawDashedSegment
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawQuadrilateral
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.extendGuide
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.midpoint
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.normalizeAngleToOrthogonalRange
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.pelvicArcRadius
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.pelvicGeometry
import kotlin.math.PI
import kotlin.math.atan2

internal fun DrawScope.drawLineWithHorizontalAndArc(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    if (points.size < 2) return
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
    drawDashedSegment(
        start = Offset(points[0].x - 100f, points[0].y),
        end = Offset(points[0].x + 100f, points[0].y),
        color = helperGuideColor,
        strokeWidth = 1.4f,
        dashed = true,
    )
    val angle = atan2(points[1].y - points[0].y, points[1].x - points[0].x) * (180f / PI.toFloat())
    val normalized = normalizeAngleToOrthogonalRange(angle)
    drawAngleArc(
        vertex = points[0],
        startAngleDegrees = 0f,
        endAngleDegrees = normalized,
        radius = 30f,
        color = color,
    )
}

internal fun DrawScope.drawSingleLineWithHorizontal(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    if (points.size < 2) return
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
    drawDashedSegment(
        start = Offset(points[0].x - 100f, points[0].y),
        end = Offset(points[0].x + 100f, points[0].y),
        color = helperGuideColor,
        strokeWidth = 1.4f,
        dashed = true,
    )
}

internal fun DrawScope.drawTwoDashedLines(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    if (points.size < 4) return
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
    drawLine(color = color, start = points[2], end = points[3], strokeWidth = 2.4f)

    val primaryGuide = extendGuide(points[0], points[1])
    val secondaryGuide = extendGuide(points[2], points[3])
    drawDashedSegment(primaryGuide.first, primaryGuide.second, helperGuideColor, 1.4f, dashed = true)
    drawDashedSegment(secondaryGuide.first, secondaryGuide.second, helperGuideColor, 1.4f, dashed = true)
}

internal fun DrawScope.drawSacralWithPerpendicular(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    if (points.size < 2) return
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
    val mid = midpoint(points[0], points[1])
    drawDashedSegment(
        start = mid,
        end = Offset(mid.x, size.height + 100f),
        color = helperGuideColor,
        strokeWidth = 1.4f,
        dashed = true,
    )
}

internal fun DrawScope.drawSS(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    val geometry = pelvicGeometry(points) ?: return
    drawLine(color = color, start = geometry.sacralLeft, end = geometry.sacralRight, strokeWidth = 2.4f)
    drawDashedSegment(
        start = Offset(geometry.sacralLeft.x - 100f, geometry.sacralLeft.y),
        end = Offset(geometry.sacralLeft.x + 100f, geometry.sacralLeft.y),
        color = helperGuideColor,
        strokeWidth = 1.4f,
        dashed = true,
    )
    val normalLength = 80f
    drawDashedSegment(
        start = Offset(
            geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength,
            geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength,
        ),
        end = Offset(
            geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
            geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
        ),
        color = color,
        strokeWidth = 1.5f,
        dashed = true,
    )
    drawCircle(color = color, radius = 3f, center = geometry.sacralMidpoint)
}

internal fun DrawScope.drawPi(
    points: List<Offset>,
    color: Color,
) {
    val geometry = pelvicGeometry(points) ?: return
    val normalLength = 80f
    drawLine(color = color, start = geometry.sacralLeft, end = geometry.sacralRight, strokeWidth = 2.4f)
    drawDashedSegment(
        start = Offset(
            geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength,
            geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength,
        ),
        end = Offset(
            geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
            geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
        ),
        color = color,
        strokeWidth = 1.5f,
        dashed = true,
    )
    drawCircle(color = color, radius = 3f, center = geometry.sacralMidpoint)
    val femoral = geometry.femoralHeadCenter ?: return
    drawDashedSegment(femoral, geometry.sacralMidpoint, color, 1.8f, dashed = true)
    val femoralAngle = angleDegrees(geometry.sacralMidpoint, femoral)
    val normalAngle = closestAngle(
        femoralAngle,
        listOf(
            angleDegrees(Offset.Zero, geometry.sacralNormal),
            angleDegrees(Offset.Zero, Offset(-geometry.sacralNormal.x, -geometry.sacralNormal.y)),
        ),
    )
    val radius = pelvicArcRadius(femoral, geometry.sacralMidpoint, normalLength, inner = false)
    drawAngleArc(geometry.sacralMidpoint, normalAngle, femoralAngle, radius, color)
}

internal fun DrawScope.drawPt(
    points: List<Offset>,
    color: Color,
    helperGuideColor: Color,
) {
    val geometry = pelvicGeometry(points) ?: return
    drawLine(color = color, start = geometry.sacralLeft, end = geometry.sacralRight, strokeWidth = 2.4f)
    drawCircle(color = color, radius = 3f, center = geometry.sacralMidpoint)
    drawDashedSegment(
        start = Offset(geometry.sacralMidpoint.x, geometry.sacralMidpoint.y - 80f),
        end = Offset(geometry.sacralMidpoint.x, geometry.sacralMidpoint.y + 80f),
        color = helperGuideColor,
        strokeWidth = 1.4f,
        dashed = true,
    )
    val femoral = geometry.femoralHeadCenter ?: return
    drawDashedSegment(femoral, geometry.sacralMidpoint, color, 1.8f, dashed = true)
    val femoralAngle = angleDegrees(geometry.sacralMidpoint, femoral)
    val verticalAngle = closestAngle(femoralAngle, listOf(-90f, 90f))
    val radius = pelvicArcRadius(femoral, geometry.sacralMidpoint, 80f, inner = true)
    drawAngleArc(geometry.sacralMidpoint, verticalAngle, femoralAngle, radius, color)
}

internal fun DrawScope.drawVerticalGuideLines(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 2) return
    val height = 150f
    points.take(2).forEach { point ->
        drawDashedSegment(
            start = Offset(point.x, point.y - height / 2f),
            end = Offset(point.x, point.y + height / 2f),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
    }
}

internal fun DrawScope.drawTts(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 2) return
    val trunkMid = midpoint(points[0], points[1])
    val height = 150f
    drawLine(color = color, start = points[0], end = points[1], strokeWidth = 2.4f)
    drawDashedSegment(
        start = Offset(trunkMid.x, trunkMid.y - height / 2f),
        end = Offset(trunkMid.x, trunkMid.y + height / 2f),
        color = color,
        strokeWidth = 2f,
        dashed = true,
    )
    if (points.size < 4) return
    val sacralMid = midpoint(points[2], points[3])
    drawLine(color = color.copy(alpha = 0.6f), start = points[2], end = points[3], strokeWidth = 2.2f)
    drawDashedSegment(
        start = Offset(sacralMid.x, sacralMid.y - height / 2f),
        end = Offset(sacralMid.x, sacralMid.y + height / 2f),
        color = color.copy(alpha = 0.7f),
        strokeWidth = 2f,
        dashed = true,
    )
    val connectorY = (trunkMid.y + sacralMid.y) / 2f
    drawLine(color = color, start = Offset(trunkMid.x, connectorY), end = Offset(sacralMid.x, connectorY), strokeWidth = 1.6f)
    drawArrowHead(Offset(minOf(trunkMid.x, sacralMid.x), connectorY), color, pointingRight = true)
    drawArrowHead(Offset(maxOf(trunkMid.x, sacralMid.x), connectorY), color, pointingRight = false)
}

internal fun DrawScope.drawHorizontalGuideLines(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 2) return
    val width = 150f
    points.take(2).forEach { point ->
        drawDashedSegment(
            start = Offset(point.x - width / 2f, point.y),
            end = Offset(point.x + width / 2f, point.y),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
    }
}

internal fun DrawScope.drawC7Offset(
    points: List<Offset>,
    color: Color,
) {
    if (points.isEmpty()) return
    val height = 150f
    if (points.size >= 4) {
        drawQuadrilateral(points.take(4), color.copy(alpha = 0.45f))
        val center = average(points.take(4))
        drawCircle(color = color, radius = 3f, center = center)
        drawDashedSegment(
            start = Offset(center.x, center.y - height / 2f),
            end = Offset(center.x, center.y + height / 2f),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
    }
    if (points.size >= 6) {
        val referenceMid = midpoint(points[4], points[5])
        drawDashedSegment(points[4], points[5], color.copy(alpha = 0.5f), 1.4f, dashed = true)
        drawCircle(color = color, radius = 3f, center = referenceMid)
        drawDashedSegment(
            start = Offset(referenceMid.x, referenceMid.y - height / 2f),
            end = Offset(referenceMid.x, referenceMid.y + height / 2f),
            color = color,
            strokeWidth = 2f,
            dashed = true,
        )
    }
}

internal fun DrawScope.drawTpa(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 7) return
    drawQuadrilateral(points.take(4), color.copy(alpha = 0.35f))
    val center = average(points.take(4))
    val vertex = points[4]
    val tailMid = midpoint(points[5], points[6])
    drawDashedSegment(center, vertex, color, 2f, dashed = true)
    drawDashedSegment(vertex, tailMid, color, 2f, dashed = true)
    drawDashedSegment(points[5], points[6], color.copy(alpha = 0.5f), 1.4f, dashed = true)
    val firstAngle = angleDegrees(vertex, center)
    val secondAngle = angleDegrees(vertex, tailMid)
    drawAngleArc(vertex, firstAngle, secondAngle, 40f, color)
}

internal fun DrawScope.drawSva(
    points: List<Offset>,
    color: Color,
) {
    if (points.size < 5) return
    drawQuadrilateral(points.take(4), color.copy(alpha = 0.35f))
    val center = average(points.take(4))
    val reference = points[4]
    drawDashedSegment(
        start = Offset(center.x, center.y - 75f),
        end = Offset(center.x, center.y + 75f),
        color = color,
        strokeWidth = 2f,
        dashed = true,
    )
    drawCircle(color = color, radius = 3f, center = center)
    drawDashedSegment(
        start = Offset(reference.x, reference.y - 75f),
        end = Offset(reference.x, reference.y + 75f),
        color = color,
        strokeWidth = 2f,
        dashed = true,
    )
}
