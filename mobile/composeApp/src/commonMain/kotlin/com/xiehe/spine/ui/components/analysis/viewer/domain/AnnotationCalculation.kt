package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ARROW
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_BOX
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_CIRCLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ELLIPSE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_HORIZONTAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_POLYGON
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_VERTICAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AVT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_COBB
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LLD
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_L4
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L4_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PELVIC
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_STANDARD_DISTANCE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SVA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T10_L2
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_SLOPE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T2_T5
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T5_T12
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TPA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_VERTEBRA_CENTER
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.sqrt

const val DEFAULT_STANDARD_DISTANCE_MM = 100.0

data class AnnotationCalibrationContext(
    val standardDistanceMm: Double?,
    val standardDistancePoints: List<MeasurementPoint>,
)

private data class PelvicMeasurementGeometry(
    val femoralHeadCenter: MeasurementPoint?,
    val sacralLeft: MeasurementPoint,
    val sacralRight: MeasurementPoint,
    val sacralMidpoint: MeasurementPoint,
    val sacralNormal: MeasurementPoint,
)

fun createManualAnnotationMeasurement(
    toolId: String,
    points: List<MeasurementPoint>,
    measurementKey: String,
    calibration: AnnotationCalibrationContext,
    standardDistanceMm: Double?,
): AnnotationMeasurement? {
    return when (toolId) {
        TOOL_T1_TILT -> angularMeasurement(
            key = measurementKey,
            type = "T1 Tilt",
            description = "T1椎体倾斜角测量",
            points = points,
            angle = angleToHorizontal(points[0], points[1]),
            signed = true,
        )

        TOOL_COBB -> cobbLikeMeasurement(
            key = measurementKey,
            type = "Cobb",
            description = "Cobb角测量",
            points = points,
        )

        TOOL_CA -> angularMeasurement(
            key = measurementKey,
            type = "CA",
            description = "锁骨角测量(Clavicle Angle)",
            points = points,
            angle = abs(angleToHorizontal(points[0], points[1])),
            signed = false,
        )

        TOOL_PELVIC -> angularMeasurement(
            key = measurementKey,
            type = "Pelvic",
            description = "骨盆倾斜角测量",
            points = points,
            angle = angleToHorizontal(points[0], points[1]),
            signed = true,
        )

        TOOL_SACRAL -> angularMeasurement(
            key = measurementKey,
            type = "Sacral",
            description = "骶骨倾斜角测量",
            points = points,
            angle = angleToHorizontal(points[0], points[1]),
            signed = true,
        )

        TOOL_AVT -> distanceMeasurement(
            key = measurementKey,
            type = "AVT",
            description = "顶椎平移量(Apical Vertebral Translation)",
            points = points,
            distanceMm = calculateActualDistance(abs(points[1].x - points[0].x), calibration),
        )

        TOOL_TS -> distanceMeasurement(
            key = measurementKey,
            type = "TS",
            description = "躯干偏移量TS(Trunk Shift)",
            points = points,
            distanceMm = calculateActualDistance(
                abs(midpoint(points[0], points[1]).x - midpoint(points[2], points[3]).x),
                calibration,
            ),
        )

        TOOL_LLD -> distanceMeasurement(
            key = measurementKey,
            type = "LLD",
            description = "双下肢不等长",
            points = points,
            distanceMm = calculateActualDistance(abs(points[1].y - points[0].y), calibration),
        )

        TOOL_C7_OFFSET -> {
            val center = average(points.take(4))
            val reference = midpoint(points[4], points[5])
            distanceMeasurement(
                key = measurementKey,
                type = "TTS",
                description = "C7偏移距离TTS(Trunk Shift)",
                points = points,
                distanceMm = calculateActualDistance(abs(center.x - reference.x), calibration),
            )
        }

        TOOL_T1_SLOPE -> angularMeasurement(
            key = measurementKey,
            type = "T1 Slope",
            description = "T1倾斜角测量（侧位）",
            points = points,
            angle = angleToHorizontal(points[0], points[1]),
            signed = true,
        )

        TOOL_CL -> cobbLikeMeasurement(
            key = measurementKey,
            type = "C2-C7 CL",
            description = "C2-C7前凸角测量(Cervical Lordosis)",
            points = points,
        )

        TOOL_TK_T2_T5 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "TK T2-T5",
            description = "上胸椎后凸角(T2上终板与T5下终板)",
            points = points,
        )

        TOOL_TK_T5_T12 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "TK T5-T12",
            description = "主胸椎后凸角(T5上终板与T12下终板)",
            points = points,
        )

        TOOL_T10_L2 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "T10-L2",
            description = "胸腰椎后凸角(T10上终板与L2下终板)",
            points = points,
        )

        TOOL_LL_L1_S1 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "LL L1-S1",
            description = "整体腰椎前凸(L1上终板与S1上终板)",
            points = points,
        )

        TOOL_LL_L1_L4 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "LL L1-L4",
            description = "腰椎前凸L1-L4(L1上终板与L4下终板)",
            points = points,
        )

        TOOL_LL_L4_S1 -> cobbLikeMeasurement(
            key = measurementKey,
            type = "LL L4-S1",
            description = "腰椎前凸L4-S1(L4上终板与S1上终板)",
            points = points,
        )

        TOOL_TPA -> {
            val center = average(points.take(4))
            val vertex = points[4]
            val tailMidpoint = midpoint(points[5], points[6])
            val firstVector = vectorFrom(vertex, center)
            val secondVector = vectorFrom(vertex, tailMidpoint)
            AnnotationMeasurement(
                key = measurementKey,
                type = "TPA",
                value = formatAngle(angleBetweenVectors(firstVector, secondVector), signed = false),
                points = points,
                description = "T1骨盆角(T1 Pelvic Angle)",
                kind = AnnotationMeasurementKind.COMPUTED,
            )
        }

        TOOL_SVA -> {
            val center = average(points.take(4))
            val reference = points[4]
            val pixelDistance = reference.x - center.x
            val actualDistance = calculateActualDistance(abs(pixelDistance), calibration)
            val signedDistance = if (pixelDistance > 0.0) actualDistance else -actualDistance
            AnnotationMeasurement(
                key = measurementKey,
                type = "SVA",
                value = formatDistance(signedDistance),
                points = points,
                description = "矢状面垂直轴(Sagittal Vertical Axis)",
                kind = AnnotationMeasurementKind.COMPUTED,
            )
        }

        TOOL_PI -> {
            val geometry = pelvicGeometry(points) ?: return null
            val femoral = geometry.femoralHeadCenter ?: return null
            val cToM = vectorFrom(femoral, geometry.sacralMidpoint)
            val angle = toAcuteAngle(angleBetweenVectors(cToM, geometry.sacralNormal))
            AnnotationMeasurement(
                key = measurementKey,
                type = "PI",
                value = formatAngle(angle, signed = false),
                points = points,
                description = "骨盆入射角(Pelvic Incidence)",
                kind = AnnotationMeasurementKind.COMPUTED,
            )
        }

        TOOL_PT -> {
            val geometry = pelvicGeometry(points) ?: return null
            val femoral = geometry.femoralHeadCenter ?: return null
            val dx = geometry.sacralMidpoint.x - femoral.x
            val dy = geometry.sacralMidpoint.y - femoral.y
            val magnitude = atan2(abs(dx), abs(dy)) * (180.0 / PI)
            val angle = if (dx < 0) -magnitude else magnitude
            AnnotationMeasurement(
                key = measurementKey,
                type = "PT",
                value = formatAngle(angle, signed = true),
                points = points,
                description = "骨盆倾斜角(Pelvic Tilt)",
                kind = AnnotationMeasurementKind.COMPUTED,
            )
        }

        TOOL_SS -> angularMeasurement(
            key = measurementKey,
            type = "SS",
            description = "骶骨倾斜角(Sacral Slope)",
            points = points,
            angle = abs(angleToHorizontal(points[0], points[1])),
            signed = false,
        )

        TOOL_LENGTH -> distanceMeasurement(
            key = measurementKey,
            type = "长度测量",
            description = "距离测量工具",
            points = points,
            distanceMm = calculateRawLengthDistance(points[0], points[1], calibration),
        )

        TOOL_AUX_LENGTH,
        -> distanceMeasurement(
            key = measurementKey,
            type = "距离标注",
            description = "辅助距离测量",
            points = points,
            distanceMm = calculateRawLengthDistance(points[0], points[1], calibration),
            auxiliary = toolId == TOOL_AUX_LENGTH,
        )

        TOOL_ANGLE -> {
            val angle = angleAtVertex(points[0], points[1], points[2])
            AnnotationMeasurement(
                key = measurementKey,
                type = "角度测量",
                value = formatAngle(angle, signed = false),
                points = points,
                description = "通用角度测量",
                kind = AnnotationMeasurementKind.COMPUTED,
            )
        }

        TOOL_AUX_ANGLE -> {
            val firstVector = vectorFrom(points[0], points[1])
            val secondVector = vectorFrom(points[2], points[3])
            AnnotationMeasurement(
                key = measurementKey,
                type = "角度标注",
                value = formatAngle(angleBetweenVectors(firstVector, secondVector), signed = false),
                points = points,
                description = "辅助角度测量（两条线段夹角）",
                kind = AnnotationMeasurementKind.COMPUTED,
                auxiliary = true,
            )
        }

        TOOL_AUX_HORIZONTAL_LINE -> distanceMeasurement(
            key = measurementKey,
            type = "辅助水平线",
            description = "辅助水平线段长度测量",
            points = listOf(points[0], MeasurementPoint(x = points[1].x, y = points[0].y)),
            distanceMm = calculateActualDistance(abs(points[1].x - points[0].x), calibration),
            auxiliary = true,
        )

        TOOL_AUX_VERTICAL_LINE -> distanceMeasurement(
            key = measurementKey,
            type = "辅助垂直线",
            description = "辅助垂直线段长度测量",
            points = listOf(points[0], MeasurementPoint(x = points[0].x, y = points[1].y)),
            distanceMm = calculateActualDistance(abs(points[1].y - points[0].y), calibration),
            auxiliary = true,
        )

        TOOL_STANDARD_DISTANCE -> {
            val mm = standardDistanceMm ?: DEFAULT_STANDARD_DISTANCE_MM
            AnnotationMeasurement(
                key = measurementKey,
                type = "标准距离",
                value = "${formatStandardDistanceInput(mm)}mm",
                points = points,
                description = "标准距离校准线",
                kind = AnnotationMeasurementKind.COMPUTED,
                panelVisible = false,
            )
        }

        TOOL_VERTEBRA_CENTER -> {
            val center = average(points)
            AnnotationMeasurement(
                key = measurementKey,
                type = "椎体中心",
                value = formatPointValue(center),
                points = points,
                description = "标注椎体中心（4个角点）",
                kind = AnnotationMeasurementKind.COMPUTED,
                auxiliary = true,
            )
        }

        TOOL_AUX_CIRCLE -> auxiliaryMeasurement(measurementKey, "Auxiliary Circle", points)
        TOOL_AUX_ELLIPSE -> auxiliaryMeasurement(measurementKey, "Auxiliary Ellipse", points)
        TOOL_AUX_BOX -> auxiliaryMeasurement(measurementKey, "Auxiliary Box", points)
        TOOL_AUX_ARROW -> auxiliaryMeasurement(measurementKey, "Arrow", points)
        TOOL_AUX_POLYGON -> auxiliaryMeasurement(measurementKey, "Polygons", points)
        else -> null
    }
}

private fun auxiliaryMeasurement(
    key: String,
    type: String,
    points: List<MeasurementPoint>,
): AnnotationMeasurement {
    return AnnotationMeasurement(
        key = key,
        type = type,
        value = "辅助图形",
        points = points,
        description = "辅助图形-$type",
        kind = AnnotationMeasurementKind.COMPUTED,
        auxiliary = true,
    )
}

private fun angularMeasurement(
    key: String,
    type: String,
    description: String,
    points: List<MeasurementPoint>,
    angle: Double,
    signed: Boolean,
): AnnotationMeasurement {
    return AnnotationMeasurement(
        key = key,
        type = type,
        value = formatAngle(angle, signed = signed),
        points = points,
        description = description,
        kind = AnnotationMeasurementKind.COMPUTED,
    )
}

private fun distanceMeasurement(
    key: String,
    type: String,
    description: String,
    points: List<MeasurementPoint>,
    distanceMm: Double,
    auxiliary: Boolean = false,
): AnnotationMeasurement {
    return AnnotationMeasurement(
        key = key,
        type = type,
        value = formatDistance(distanceMm),
        points = points,
        description = description,
        kind = AnnotationMeasurementKind.COMPUTED,
        auxiliary = auxiliary,
    )
}

private fun cobbLikeMeasurement(
    key: String,
    type: String,
    description: String,
    points: List<MeasurementPoint>,
): AnnotationMeasurement {
    val firstAngle = atan2(points[1].y - points[0].y, points[1].x - points[0].x)
    val secondAngle = atan2(points[3].y - points[2].y, points[3].x - points[2].x)
    var angleDiff = abs(secondAngle - firstAngle) * (180.0 / PI)
    if (angleDiff > 180.0) {
        angleDiff = 360.0 - angleDiff
    }
    val leftYDistance = abs(points[2].y - points[0].y)
    val rightYDistance = abs(points[3].y - points[1].y)
    val signedAngle = if (leftYDistance > rightYDistance) -angleDiff else angleDiff
    return AnnotationMeasurement(
        key = key,
        type = type,
        value = formatAngle(signedAngle, signed = true),
        points = points,
        description = description,
        kind = AnnotationMeasurementKind.COMPUTED,
    )
}

private fun calculateActualDistance(
    pixelDistance: Double,
    calibration: AnnotationCalibrationContext,
): Double {
    val mm = calibration.standardDistanceMm
    val standardPoints = calibration.standardDistancePoints
    if (mm != null && standardPoints.size >= 2) {
        val standardPixelDistance = distance(standardPoints[0], standardPoints[1])
        if (standardPixelDistance > 0.0) {
            return pixelDistance / standardPixelDistance * mm
        }
    }
    return pixelDistance / 1000.0 * 300.0
}

private fun calculateRawLengthDistance(
    first: MeasurementPoint,
    second: MeasurementPoint,
    calibration: AnnotationCalibrationContext,
): Double {
    val pixelDistance = distance(first, second)
    val mm = calibration.standardDistanceMm
    val standardPoints = calibration.standardDistancePoints
    if (mm != null && standardPoints.size >= 2) {
        val standardPixelDistance = distance(standardPoints[0], standardPoints[1])
        if (standardPixelDistance > 0.0) {
            return pixelDistance / standardPixelDistance * mm
        }
    }
    return pixelDistance * 0.1
}

private fun pelvicGeometry(points: List<MeasurementPoint>): PelvicMeasurementGeometry? {
    if (points.size < 2) return null
    val femoralHeadCenter = if (points.size >= 3) points[0] else null
    val sacralLeft = if (points.size >= 3) points[1] else points[0]
    val sacralRight = if (points.size >= 3) points[2] else points[1]
    val endplateDx = sacralRight.x - sacralLeft.x
    val endplateDy = sacralRight.y - sacralLeft.y
    val endplateLength = sqrt(endplateDx * endplateDx + endplateDy * endplateDy)
    if (endplateLength == 0.0) return null
    return PelvicMeasurementGeometry(
        femoralHeadCenter = femoralHeadCenter,
        sacralLeft = sacralLeft,
        sacralRight = sacralRight,
        sacralMidpoint = midpoint(sacralLeft, sacralRight),
        sacralNormal = MeasurementPoint(
            x = -endplateDy / endplateLength,
            y = endplateDx / endplateLength,
        ),
    )
}

private fun angleToHorizontal(start: MeasurementPoint, end: MeasurementPoint): Double {
    var angle = atan2(end.y - start.y, end.x - start.x) * (180.0 / PI)
    if (angle > 90.0) angle -= 180.0
    if (angle < -90.0) angle += 180.0
    return angle
}

private fun angleAtVertex(
    first: MeasurementPoint,
    vertex: MeasurementPoint,
    third: MeasurementPoint,
): Double {
    return angleBetweenVectors(
        vectorFrom(vertex, first),
        vectorFrom(vertex, third),
    )
}

private fun angleBetweenVectors(first: MeasurementPoint, second: MeasurementPoint): Double {
    val dot = first.x * second.x + first.y * second.y
    val mag1 = hypot(first.x, first.y)
    val mag2 = hypot(second.x, second.y)
    if (mag1 == 0.0 || mag2 == 0.0) return 0.0
    val cos = (dot / (mag1 * mag2)).coerceIn(-1.0, 1.0)
    return acos(cos) * (180.0 / PI)
}

private fun toAcuteAngle(angle: Double): Double {
    return if (angle > 90.0) 180.0 - angle else angle
}

private fun vectorFrom(origin: MeasurementPoint, target: MeasurementPoint): MeasurementPoint {
    return MeasurementPoint(x = target.x - origin.x, y = target.y - origin.y)
}

private fun midpoint(first: MeasurementPoint, second: MeasurementPoint): MeasurementPoint {
    return MeasurementPoint(
        x = (first.x + second.x) / 2.0,
        y = (first.y + second.y) / 2.0,
    )
}

private fun average(points: List<MeasurementPoint>): MeasurementPoint {
    return MeasurementPoint(
        x = points.map { it.x }.average(),
        y = points.map { it.y }.average(),
    )
}

private fun distance(first: MeasurementPoint, second: MeasurementPoint): Double {
    return hypot(second.x - first.x, second.y - first.y)
}

private fun formatAngle(value: Double, signed: Boolean): String {
    val normalized = if (signed) value else abs(value)
    return "${normalized.toBigDecimal().setScale(2, java.math.RoundingMode.HALF_UP)}°"
}

private fun formatDistance(value: Double): String {
    return "${value.toBigDecimal().setScale(2, java.math.RoundingMode.HALF_UP)}mm"
}

private fun formatPointValue(point: MeasurementPoint): String {
    val x = point.x.toBigDecimal().setScale(1, java.math.RoundingMode.HALF_UP)
    val y = point.y.toBigDecimal().setScale(1, java.math.RoundingMode.HALF_UP)
    return "($x, $y)"
}

private fun formatStandardDistanceInput(value: Double): String {
    return value.toBigDecimal()
        .setScale(2, java.math.RoundingMode.HALF_UP)
        .stripTrailingZeros()
        .toPlainString()
}
