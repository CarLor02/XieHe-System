package com.xiehe.spine.ui.components.analysis.viewer.domain

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationTagAnchorStyle
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolColorKey
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationToolByMeasurementType
import com.xiehe.spine.ui.theme.SpineAnnotationToolColors
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sqrt

internal enum class AnnotationRenderType {
    LINE_WITH_HORIZONTAL_ARC,
    SINGLE_LINE_WITH_HORIZONTAL,
    TWO_DASHED_LINES,
    SACRAL_WITH_PERPENDICULAR,
    SS,
    PI,
    PT,
    VERTICAL_GUIDE_LINES,
    TTS,
    HORIZONTAL_GUIDE_LINES,
    C7_OFFSET,
    TPA,
    SVA,
    THREE_POINT_ANGLE,
    SIMPLE_LINE,
    SINGLE_HORIZONTAL_LINE,
    SINGLE_VERTICAL_LINE,
    CIRCLE,
    ELLIPSE,
    BOX,
    ARROW,
    POLYGON,
    VERTEBRA_CENTER,
}

internal fun resolveAnnotationRenderType(
    type: String,
    pointsCount: Int = 0,
): AnnotationRenderType = when {
    isC7OffsetMeasurement(type, pointsCount) -> AnnotationRenderType.C7_OFFSET
    isTrunkShiftMeasurement(type, pointsCount) -> AnnotationRenderType.TTS
    else -> when (type) {
        "T1 Tilt",
        "T1 Slope",
        -> AnnotationRenderType.LINE_WITH_HORIZONTAL_ARC

        "CA",
        "Pelvic",
        "PO",
        -> AnnotationRenderType.SINGLE_LINE_WITH_HORIZONTAL

        "Cobb",
        "C2-C7 CL",
        "TK T2-T5",
        "TK T5-T12",
        "T10-L2",
        "LL L1-S1",
        "LL L1-L4",
        "LL L4-S1",
        "角度标注",
        -> AnnotationRenderType.TWO_DASHED_LINES

        "Sacral",
        "CSS",
        -> AnnotationRenderType.SACRAL_WITH_PERPENDICULAR
        "SS" -> AnnotationRenderType.SS
        "PI" -> AnnotationRenderType.PI
        "PT" -> AnnotationRenderType.PT
        "AVT" -> AnnotationRenderType.VERTICAL_GUIDE_LINES
        "LLD" -> AnnotationRenderType.HORIZONTAL_GUIDE_LINES
        "TPA" -> AnnotationRenderType.TPA
        "SVA" -> AnnotationRenderType.SVA
        "角度测量" -> AnnotationRenderType.THREE_POINT_ANGLE
        "辅助水平线" -> AnnotationRenderType.SINGLE_HORIZONTAL_LINE
        "辅助垂直线" -> AnnotationRenderType.SINGLE_VERTICAL_LINE
        "Auxiliary Circle",
        "圆形标注",
        -> AnnotationRenderType.CIRCLE
        "Auxiliary Ellipse",
        "椭圆标注",
        -> AnnotationRenderType.ELLIPSE
        "Auxiliary Box",
        "矩形标注",
        -> AnnotationRenderType.BOX
        "Arrow",
        "箭头标注",
        -> AnnotationRenderType.ARROW
        "Polygons",
        "多边形标注",
        -> AnnotationRenderType.POLYGON
        "椎体中心" -> AnnotationRenderType.VERTEBRA_CENTER
        else -> AnnotationRenderType.SIMPLE_LINE
    }
}

fun resolveAnnotationColor(
    measurement: AnnotationMeasurement,
    colors: SpineAnnotationToolColors,
): Color {
    if (measurement.kind == AnnotationMeasurementKind.DETECTED) {
        return colors.detectedPoint
    }

    val tool = resolveMeasurementTool(measurement)
    return tool?.let { colors.resolveColor(it.colorKey) } ?: colors.length
}

fun valueColorFor(
    measurement: AnnotationMeasurement,
    colors: SpineAnnotationToolColors,
): Color = resolveAnnotationColor(measurement, colors)

fun shouldShowMetricTag(measurement: AnnotationMeasurement): Boolean {
    if (measurement.kind != AnnotationMeasurementKind.COMPUTED) return false
    if (measurement.auxiliary && measurement.type !in setOf("辅助水平线", "辅助垂直线")) return false
    if (measurement.type == "标准距离") return false
    if (measurement.value == "--") return false
    return measurement.points.size >= 2 || measurement.type == "椎体中心"
}

fun shouldShowAuxiliaryShapeTag(measurement: AnnotationMeasurement): Boolean {
    if (!isEditableAuxiliaryAnnotation(measurement)) return false
    if (resolveAnnotationRenderType(measurement.type, measurement.points.size) in setOf(
        AnnotationRenderType.CIRCLE,
        AnnotationRenderType.ELLIPSE,
        AnnotationRenderType.BOX,
        AnnotationRenderType.ARROW,
        AnnotationRenderType.POLYGON,
    )) return true

    val custom = measurement.description?.trim()
    return !custom.isNullOrEmpty() && !isGeneratedAuxiliaryDescription(custom)
}

fun formatMeasurementTag(measurement: AnnotationMeasurement): String =
    "${measurement.type}: ${formatDisplayValue(measurement.value)}"

fun formatAuxiliaryTag(measurement: AnnotationMeasurement): String {
    val custom = measurement.description?.trim()
    if (!custom.isNullOrEmpty() && !isGeneratedAuxiliaryDescription(custom)) {
        return custom
    }

    return getAnnotationToolByMeasurementType(measurement.type)?.label ?: measurement.type
}

fun resolveMeasurementTagAnchor(
    measurement: AnnotationMeasurement,
    sx: Float,
    sy: Float,
    imageScale: Float,
): Offset {
    val points = measurement.points.map { Offset((it.x * sx).toFloat(), (it.y * sy).toFloat()) }
    if (points.isEmpty()) return Offset.Zero

    val safeScale = imageScale.coerceAtLeast(0.1f)
    return resolveCatalogTagAnchor(
        type = measurement.type,
        points = points,
        imageScale = safeScale,
    ) ?: run {
        val tool = resolveMeasurementTool(measurement)
        when (tool?.tagAnchorStyle) {
            AnnotationTagAnchorStyle.MIDPOINT_ABOVE -> midpoint(points.first(), points.last()).copy(
                y = minOf(points.first().y, points.last().y) - 20f,
            )

            AnnotationTagAnchorStyle.AVERAGE_ABOVE -> average(points).copy(y = points.minOf { it.y } - 18f)
            AnnotationTagAnchorStyle.AVERAGE_ABOVE_COMPACT -> average(points).copy(y = points.minOf { it.y } - 24f)
            AnnotationTagAnchorStyle.CENTER -> average(points)
            null -> average(points)
        }
    }
}

fun calculateSmartTagPosition(
    basePosition: Offset,
    occupiedPositions: List<Offset>,
    imageScale: Float,
): Offset {
    if (occupiedPositions.isEmpty()) return basePosition

    val safeScale = imageScale.coerceAtLeast(0.1f)
    val verticalOffset = 40f / safeScale
    val horizontalOffset = 50f / safeScale
    val overlapThreshold = 90f / safeScale

    fun overlaps(candidate: Offset): Boolean = occupiedPositions.any { occupied ->
        hypot(candidate.x - occupied.x, candidate.y - occupied.y) < overlapThreshold
    }

    if (!overlaps(basePosition)) return basePosition

    val candidates = listOf(
        basePosition + Offset(0f, -verticalOffset),
        basePosition + Offset(0f, verticalOffset),
        basePosition + Offset(-horizontalOffset, 0f),
        basePosition + Offset(-horizontalOffset, -verticalOffset),
        basePosition + Offset(-horizontalOffset, verticalOffset),
        basePosition + Offset(horizontalOffset, -verticalOffset),
        basePosition + Offset(horizontalOffset, verticalOffset),
        basePosition + Offset(0f, -verticalOffset * 2),
        basePosition + Offset(0f, verticalOffset * 2),
    )

    return candidates.firstOrNull { candidate -> !overlaps(candidate) }
        ?: (basePosition + Offset(0f, -verticalOffset * 2.5f))
}

private fun resolveCatalogTagAnchor(
    type: String,
    points: List<Offset>,
    imageScale: Float,
): Offset? {
    return when (type) {
        "T1 Tilt" -> midpoint(points[0], points[1]).copy(
            y = midpoint(points[0], points[1]).y - 20f,
        )

        "CA" -> midpoint(points[0], points[1]).copy(
            y = midpoint(points[0], points[1]).y - 20f,
        )

        "Pelvic",
        "PO",
        "Sacral",
        "CSS",
        "SS",
        "长度测量",
        "距离标注",
        -> {
            val rightPoint = if (points[0].x > points[1].x) points[0] else points[1]
            Offset(
                x = rightPoint.x + LABEL_OFFSET_RIGHT / imageScale,
                y = rightPoint.y - LABEL_OFFSET_TOP / imageScale,
            )
        }

        "AVT" -> Offset(
            x = (points[0].x + points[1].x) / 2f,
            y = minOf(points[0].y, points[1].y) - 20f / imageScale,
        )

        "TS" -> resolveTsTagAnchor(points, imageScale)

        "LLD" -> Offset(
            x = max(points[0].x, points[1].x) + 20f / imageScale,
            y = (points[0].y + points[1].y) / 2f,
        )

        "TTS",
        "TS(Trunk Shift)",
        -> if (isC7OffsetMeasurement(type, points.size)) {
            resolveC7OffsetTagAnchor(points, imageScale)
        } else {
            resolveTsTagAnchor(points, imageScale)
        }

        "T1 Slope" -> Offset(
            x = (points[0].x + points[1].x) / 2f,
            y = minOf(points[0].y, points[1].y) - 30f / imageScale,
        )

        "Cobb",
        "角度标注",
        -> Offset(
            x = points.maxOf { it.x } + LABEL_OFFSET_COMPLEX_RIGHT / imageScale,
            y = points.minOf { it.y } - LABEL_OFFSET_TOP / imageScale,
        )

        "C2-C7 CL",
        "TK T2-T5",
        "TK T5-T12",
        "T10-L2",
        "LL L1-S1",
        "LL L1-L4",
        "LL L4-S1",
        -> Offset(
            x = points.averageOf { it.x },
            y = points.minOf { it.y } - LABEL_OFFSET_TOP / imageScale,
        )

        "TPA" -> {
            val centerPoint = average(points.take(4))
            val midY = (points[5].y + points[6].y) / 2f
            Offset(
                x = points.maxOf { it.x } + LABEL_OFFSET_RIGHT / imageScale,
                y = minOf(centerPoint.y, points[4].y, midY) - LABEL_OFFSET_TOP / imageScale,
            )
        }

        "SVA" -> Offset(
            x = points.maxOf { it.x } + LABEL_OFFSET_RIGHT / imageScale,
            y = points.take(4).minOf { it.y } - LABEL_OFFSET_TOP / imageScale,
        )

        "PI" -> {
            val geometry = pelvicGeometry(points) ?: return points.firstOrNull()
            val femoral = geometry.femoralHeadCenter ?: return points.firstOrNull()
            Offset(
                x = maxOf(femoral.x, geometry.sacralMidpoint.x, points.maxOf { it.x }) + LABEL_OFFSET_RIGHT / imageScale,
                y = minOf(femoral.y, geometry.sacralMidpoint.y) - LABEL_OFFSET_TOP / imageScale,
            )
        }

        "PT" -> {
            val geometry = pelvicGeometry(points) ?: return points.firstOrNull()
            val femoral = geometry.femoralHeadCenter ?: return points.firstOrNull()
            Offset(
                x = maxOf(femoral.x, geometry.sacralMidpoint.x, points.maxOf { it.x }) + LABEL_OFFSET_RIGHT / imageScale,
                y = maxOf(femoral.y, geometry.sacralMidpoint.y) + LABEL_OFFSET_BOTTOM / imageScale,
            )
        }

        "角度测量" -> Offset(
            x = points[1].x + LABEL_OFFSET_RIGHT / imageScale,
            y = points[1].y - LABEL_OFFSET_TOP / imageScale,
        )

        "辅助水平线" -> Offset(
            x = (points[0].x + points[1].x) / 2f,
            y = points[0].y - 16f / imageScale,
        )

        "辅助垂直线" -> Offset(
            x = points[0].x + 16f / imageScale,
            y = (points[0].y + points[1].y) / 2f,
        )

        "Auxiliary Circle",
        "圆形标注",
        -> {
            val center = points[0]
            if (points.size >= 2) {
                val radius = distance(points[1], center)
                Offset(
                    x = center.x,
                    y = center.y + max(radius / 2f, 30f / imageScale),
                )
            } else {
                center
            }
        }

        "Auxiliary Ellipse",
        "椭圆标注",
        -> {
            val center = points[0]
            if (points.size >= 2) {
                val radiusY = kotlin.math.abs(points[1].y - center.y)
                Offset(
                    x = center.x,
                    y = center.y + max(radiusY / 2f, 30f / imageScale),
                )
            } else {
                center
            }
        }

        "Auxiliary Box",
        "矩形标注",
        -> Offset(
            x = (points[0].x + points[1].x) / 2f,
            y = minOf(points[0].y, points[1].y) - 20f / imageScale,
        )

        "Arrow",
        "箭头标注",
        "Polygons",
        "多边形标注",
        -> points.firstOrNull()

        "椎体中心" -> average(points.take(4)).copy(
            y = average(points.take(4)).y - 20f / imageScale,
        )

        else -> null
    }
}

private fun resolveMeasurementTool(measurement: AnnotationMeasurement) = when {
    isC7OffsetMeasurement(measurement.type, measurement.points.size) -> getAnnotationToolByMeasurementType("TTS")
    isTrunkShiftMeasurement(measurement.type, measurement.points.size) -> getAnnotationToolByMeasurementType("TS")
    else -> getAnnotationToolByMeasurementType(measurement.type)
}

private fun isTrunkShiftMeasurement(
    type: String,
    pointsCount: Int,
): Boolean {
    return type in setOf("TS", "TTS") && pointsCount < 6
}

private fun isC7OffsetMeasurement(
    type: String,
    pointsCount: Int,
): Boolean {
    return type == "TS(Trunk Shift)" || (type in setOf("TS", "TTS") && pointsCount >= 6)
}

private fun resolveTsTagAnchor(
    points: List<Offset>,
    imageScale: Float,
): Offset {
    if (points.size < 4) {
        return Offset(
            x = points.maxOf { it.x } + LABEL_OFFSET_RIGHT / imageScale,
            y = points.minOf { it.y } - LABEL_OFFSET_TOP / imageScale,
        )
    }
    val trunkMidY = (points[0].y + points[1].y) / 2f
    val sacralMidY = (points[2].y + points[3].y) / 2f
    return Offset(
        x = points.maxOf { it.x } + LABEL_OFFSET_RIGHT / imageScale,
        y = minOf(trunkMidY, sacralMidY) - LABEL_OFFSET_TOP / imageScale,
    )
}

private fun resolveC7OffsetTagAnchor(
    points: List<Offset>,
    imageScale: Float,
): Offset {
    if (points.size < 6) {
        return resolveTsTagAnchor(points, imageScale)
    }
    val centerY = points.take(4).averageOf { it.y }
    val refY = (points[4].y + points[5].y) / 2f
    return Offset(
        x = points.maxOf { it.x } + LABEL_OFFSET_RIGHT / imageScale,
        y = minOf(centerY, refY) - LABEL_OFFSET_TOP / imageScale,
    )
}

private data class PelvicGeometry(
    val femoralHeadCenter: Offset?,
    val sacralMidpoint: Offset,
)

private fun pelvicGeometry(points: List<Offset>): PelvicGeometry? {
    if (points.size < 2) return null
    val femoralHeadCenter = if (points.size >= 3) points[0] else null
    val sacralLeft = if (points.size >= 3) points[1] else points[0]
    val sacralRight = if (points.size >= 3) points[2] else points[1]
    return PelvicGeometry(
        femoralHeadCenter = femoralHeadCenter,
        sacralMidpoint = midpoint(sacralLeft, sacralRight),
    )
}

private fun distance(first: Offset, second: Offset): Float {
    return sqrt((first.x - second.x).pow(2) + (first.y - second.y).pow(2))
}

private fun List<Offset>.averageOf(selector: (Offset) -> Float): Float {
    if (isEmpty()) return 0f
    return sumOf { selector(it).toDouble() }.toFloat() / size
}

private const val LABEL_OFFSET_RIGHT = 50f
private const val LABEL_OFFSET_TOP = 40f
private const val LABEL_OFFSET_BOTTOM = 40f
private const val LABEL_OFFSET_COMPLEX_RIGHT = 60f

private fun SpineAnnotationToolColors.resolveColor(colorKey: AnnotationToolColorKey): Color = when (colorKey) {
    AnnotationToolColorKey.NONE -> length
    AnnotationToolColorKey.T1_TILT -> t1Tilt
    AnnotationToolColorKey.COBB -> cobb
    AnnotationToolColorKey.CA -> ca
    AnnotationToolColorKey.PELVIC -> pelvic
    AnnotationToolColorKey.SACRAL -> sacral
    AnnotationToolColorKey.AVT -> avt
    AnnotationToolColorKey.TS -> ts
    AnnotationToolColorKey.LLD -> lld
    AnnotationToolColorKey.C7_OFFSET -> c7Offset
    AnnotationToolColorKey.T1_SLOPE -> t1Slope
    AnnotationToolColorKey.CL -> cl
    AnnotationToolColorKey.TK_T2_T5 -> tkT2T5
    AnnotationToolColorKey.TK_T5_T12 -> tkT5T12
    AnnotationToolColorKey.T10_L2 -> t10L2
    AnnotationToolColorKey.LL_L1_S1 -> llL1S1
    AnnotationToolColorKey.LL_L1_L4 -> llL1L4
    AnnotationToolColorKey.LL_L4_S1 -> llL4S1
    AnnotationToolColorKey.TPA -> tpa
    AnnotationToolColorKey.SVA -> sva
    AnnotationToolColorKey.PI -> pi
    AnnotationToolColorKey.PT -> pt
    AnnotationToolColorKey.SS -> ss
    AnnotationToolColorKey.LENGTH -> length
    AnnotationToolColorKey.ANGLE -> angle
    AnnotationToolColorKey.AUXILIARY_CIRCLE -> auxiliaryCircle
    AnnotationToolColorKey.AUXILIARY_ELLIPSE -> auxiliaryEllipse
    AnnotationToolColorKey.AUXILIARY_BOX -> auxiliaryBox
    AnnotationToolColorKey.AUXILIARY_ARROW -> auxiliaryArrow
    AnnotationToolColorKey.AUXILIARY_POLYGON -> auxiliaryPolygon
    AnnotationToolColorKey.VERTEBRA_CENTER -> vertebraCenter
    AnnotationToolColorKey.AUXILIARY_LENGTH -> auxiliaryLength
    AnnotationToolColorKey.AUXILIARY_ANGLE -> auxiliaryAngle
    AnnotationToolColorKey.AUXILIARY_HORIZONTAL_LINE -> auxiliaryHorizontalLine
    AnnotationToolColorKey.AUXILIARY_VERTICAL_LINE -> auxiliaryVerticalLine
}

private fun formatDisplayValue(value: String): String {
    val match = Regex("^(-?\\d+\\.?\\d*)\\s*(.*)$").matchEntire(value) ?: return value
    val numericValue = match.groupValues[1].toDoubleOrNull() ?: return value
    val unit = match.groupValues[2]
    val displayValue = kotlin.math.round(kotlin.math.abs(numericValue)).toInt()
    return "$displayValue$unit"
}

private fun midpoint(first: Offset, second: Offset): Offset = Offset(
    x = (first.x + second.x) / 2f,
    y = (first.y + second.y) / 2f,
)

private fun average(points: List<Offset>): Offset {
    if (points.isEmpty()) return Offset.Zero
    val totalX = points.sumOf { it.x.toDouble() }.toFloat()
    val totalY = points.sumOf { it.y.toDouble() }.toFloat()
    return Offset(x = totalX / points.size, y = totalY / points.size)
}
