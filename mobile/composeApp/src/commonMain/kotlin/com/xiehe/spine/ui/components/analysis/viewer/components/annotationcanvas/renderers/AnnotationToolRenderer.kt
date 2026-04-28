package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.DrawScope
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawBoxShape
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawC7Offset
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawCircleShape
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawEllipseShape
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawArrowShape
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawHorizontalGuideLines
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawLineWithHorizontalAndArc
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawPi
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawPolygonShape
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawPt
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSacralWithPerpendicular
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSS
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSimpleLine
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSingleHorizontalLine
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSingleLineWithHorizontal
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSingleVerticalLine
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawSva
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawThreePointAngle
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawTpa
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawTts
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawTwoDashedLines
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawVertebraCenter
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.annotationtoolrenderers.drawVerticalGuideLines
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.shared.drawDashedSegment
import com.xiehe.spine.ui.components.analysis.viewer.domain.AnnotationRenderType
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveAnnotationColor
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveAnnotationRenderType
import com.xiehe.spine.ui.theme.SpineAnnotationToolColors

fun DrawScope.drawAnnotationMeasurement(
    item: AnnotationMeasurement,
    sx: Float,
    sy: Float,
    toolColors: SpineAnnotationToolColors,
) {
    val color = resolveAnnotationColor(item, toolColors)
    val points = item.points.map { Offset((it.x * sx).toFloat(), (it.y * sy).toFloat()) }

    item.helperSegments.forEach { segment ->
        drawDashedSegment(
            start = Offset((segment.start.x * sx).toFloat(), (segment.start.y * sy).toFloat()),
            end = Offset((segment.end.x * sx).toFloat(), (segment.end.y * sy).toFloat()),
            color = if (segment.dashed) toolColors.helperGuide else color,
            strokeWidth = if (segment.dashed) 1.8f else 2.6f,
            dashed = segment.dashed,
        )
    }

    when (resolveAnnotationRenderType(item.type, item.points.size)) {
        AnnotationRenderType.LINE_WITH_HORIZONTAL_ARC -> drawLineWithHorizontalAndArc(points, color, toolColors.helperGuide)
        AnnotationRenderType.SINGLE_LINE_WITH_HORIZONTAL -> drawSingleLineWithHorizontal(points, color, toolColors.helperGuide)
        AnnotationRenderType.TWO_DASHED_LINES -> drawTwoDashedLines(points, color, toolColors.helperGuide)
        AnnotationRenderType.SACRAL_WITH_PERPENDICULAR -> drawSacralWithPerpendicular(points, color, toolColors.helperGuide)
        AnnotationRenderType.SS -> drawSS(points, color, toolColors.helperGuide)
        AnnotationRenderType.PI -> drawPi(points, color)
        AnnotationRenderType.PT -> drawPt(points, color, toolColors.helperGuide)
        AnnotationRenderType.VERTICAL_GUIDE_LINES -> drawVerticalGuideLines(points, color)
        AnnotationRenderType.TTS -> drawTts(points, color)
        AnnotationRenderType.HORIZONTAL_GUIDE_LINES -> drawHorizontalGuideLines(points, color)
        AnnotationRenderType.C7_OFFSET -> drawC7Offset(points, color)
        AnnotationRenderType.TPA -> drawTpa(points, color)
        AnnotationRenderType.SVA -> drawSva(points, color)
        AnnotationRenderType.THREE_POINT_ANGLE -> drawThreePointAngle(points, color)
        AnnotationRenderType.SIMPLE_LINE -> drawSimpleLine(points, color)
        AnnotationRenderType.SINGLE_HORIZONTAL_LINE -> drawSingleHorizontalLine(points, color)
        AnnotationRenderType.SINGLE_VERTICAL_LINE -> drawSingleVerticalLine(points, color)
        AnnotationRenderType.CIRCLE -> drawCircleShape(points, color)
        AnnotationRenderType.ELLIPSE -> drawEllipseShape(points, color)
        AnnotationRenderType.BOX -> drawBoxShape(points, color)
        AnnotationRenderType.ARROW -> drawArrowShape(points, color)
        AnnotationRenderType.POLYGON -> drawPolygonShape(points, color)
        AnnotationRenderType.VERTEBRA_CENTER -> drawVertebraCenter(points, color)
    }

    points.forEach { point ->
        drawCircle(
            color = color,
            radius = if (item.kind == AnnotationMeasurementKind.DETECTED) 4.5f else 5f,
            center = point,
        )
    }
}
