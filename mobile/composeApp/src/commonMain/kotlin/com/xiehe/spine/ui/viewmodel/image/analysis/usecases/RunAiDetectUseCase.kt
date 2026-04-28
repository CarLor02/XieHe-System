package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.data.ai.AiDetectResponse
import com.xiehe.spine.data.ai.AiInferenceRepository
import com.xiehe.spine.data.ai.AiPointNode
import com.xiehe.spine.data.ai.AiVertebraCorners
import com.xiehe.spine.data.measurement.MeasurementPoint
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.roundToInt

class RunAiDetectUseCase(
    private val aiInferenceRepository: AiInferenceRepository,
) {
    suspend operator fun invoke(
        fileId: Int,
        imageBytes: ByteArray,
        standardDistanceMm: Double?,
        standardDistancePoints: List<MeasurementPoint>,
    ): RunAiDetectOutcome {
        val calibration = CalibrationContext(
            standardDistanceMm = standardDistanceMm,
            standardDistancePoints = standardDistancePoints,
        )
        return when (val result = aiInferenceRepository.detectKeypoints(fileName = "image_$fileId.png", bytes = imageBytes)) {
            is AppResult.Success -> RunAiDetectOutcome.Success(
                measurements = mapDetectResponse(result.data, calibration),
            )

            is AppResult.Failure -> RunAiDetectOutcome.Failure(result.message)
        }
    }

    private fun mapDetectResponse(
        response: AiDetectResponse,
        calibration: CalibrationContext,
    ): List<ImageAnalysisMeasurement> {
        val output = mutableListOf<ImageAnalysisMeasurement>()
        output += computeSixMeasurements(response, calibration)
        output += buildPosePanelItems(response)
        output += buildVertebraCornerItems(response)
        return output
    }

    private fun buildPosePanelItems(response: AiDetectResponse): List<ImageAnalysisMeasurement> {
        val pose = response.poseKeypoints
        return ANALYSIS_POSE_PANEL_ORDER.map { name ->
            val node = pose[name]
            val point = node?.toPoint()
            ImageAnalysisMeasurement(
                key = "ai_detect_pose_$name",
                type = name,
                value = name,
                points = point?.let { listOf(it) } ?: emptyList(),
                description = "AI检测-躯干关键点",
                kind = AnalysisMeasurementKind.DETECTED,
                pointLabel = name,
                confidence = node?.confidence ?: node?.conf,
                panelVisible = true,
            )
        }
    }

    private fun buildVertebraCornerItems(response: AiDetectResponse): List<ImageAnalysisMeasurement> {
        val output = mutableListOf<ImageAnalysisMeasurement>()
        response.vertebrae.entries.sortedBy { it.key }.forEach { (name, node) ->
            val corners = node.corners ?: return@forEach
            listOfNotNull(
                corners.topLeft?.let { 1 to it },
                corners.topRight?.let { 2 to it },
                corners.bottomRight?.let { 3 to it },
                corners.bottomLeft?.let { 4 to it },
            ).forEach { (cornerOrder, cornerPoint) ->
                val point = cornerPoint.toPoint()
                val displayName = "$name-$cornerOrder"
                output += ImageAnalysisMeasurement(
                    key = "ai_detect_corner_${name}_$cornerOrder",
                    type = name,
                    value = displayName,
                    points = listOf(point),
                    description = "AI检测-$displayName",
                    kind = AnalysisMeasurementKind.DETECTED,
                    pointLabel = displayName,
                    confidence = cornerPoint.confidence ?: cornerPoint.conf ?: node.confidence,
                    panelVisible = true,
                )
            }
        }
        return output
    }

    private fun computeSixMeasurements(
        response: AiDetectResponse,
        calibration: CalibrationContext,
    ): List<ImageAnalysisMeasurement> {
        val output = mutableListOf<ImageAnalysisMeasurement>()
        val pose = response.poseKeypoints
        val vertebrae = response.vertebrae
        val t1Corners = vertebrae["T1"]?.corners

        output += angleMetricOrPlaceholder(
            key = "ai_compute_t1_tilt",
            type = "T1 Tilt",
            description = "T1椎体倾斜角测量",
            start = t1Corners?.topLeft?.toPoint(),
            end = t1Corners?.topRight?.toPoint(),
            signed = true,
        )
        output += measurementPlaceholder(
            key = "ai_compute_ca",
            type = "CA",
            description = "Cobb角测量",
        )
        output += angleMetricOrPlaceholder(
            key = "ai_compute_pelvic",
            type = "Pelvic",
            description = "骨盆倾斜角测量",
            start = pose["IR"]?.toPoint(),
            end = pose["IL"]?.toPoint(),
            signed = true,
        )
        output += angleMetricOrPlaceholder(
            key = "ai_compute_sacral",
            type = "Sacral",
            description = "骶骨倾斜角测量",
            start = pose["SR"]?.toPoint(),
            end = pose["SL"]?.toPoint(),
            signed = true,
        )

        val csvlX = run {
            val sr = pose["SR"]?.toPoint()
            val sl = pose["SL"]?.toPoint()
            if (sr != null && sl != null) (sr.x + sl.x) / 2.0 else null
        }
        val c7Center = vertebrae["C7"]?.corners.centerPoint()
        output += if (csvlX != null && c7Center != null) {
            val y = c7Center.y
            val left = MeasurementPoint(x = csvlX, y = y)
            val right = MeasurementPoint(x = c7Center.x, y = y)
            ImageAnalysisMeasurement(
                key = "ai_compute_ts",
                type = "TS",
                value = formatDistanceValue(abs(c7Center.x - csvlX), calibration),
                points = listOf(left, right),
                description = "躯干偏移测量",
                kind = AnalysisMeasurementKind.COMPUTED,
                panelVisible = true,
            )
        } else {
            measurementPlaceholder("ai_compute_ts", "TS", "躯干偏移测量")
        }

        val vertebraCenters = vertebrae.mapNotNull { (name, node) ->
            node.corners.centerPoint()?.let { name to it }
        }
        output += if (csvlX != null && vertebraCenters.isNotEmpty()) {
            val apex = vertebraCenters.maxByOrNull { (_, center) -> abs(center.x - csvlX) }
            if (apex != null) {
                val center = apex.second
                val left = MeasurementPoint(x = csvlX, y = center.y)
                val right = MeasurementPoint(x = center.x, y = center.y)
                ImageAnalysisMeasurement(
                    key = "ai_compute_avt",
                    type = "AVT",
                    value = formatDistanceValue(abs(center.x - csvlX), calibration),
                    points = listOf(left, right),
                    description = "顶椎偏移测量",
                    kind = AnalysisMeasurementKind.COMPUTED,
                    panelVisible = true,
                )
            } else {
                measurementPlaceholder("ai_compute_avt", "AVT", "顶椎偏移测量")
            }
        } else {
            measurementPlaceholder("ai_compute_avt", "AVT", "顶椎偏移测量")
        }

        val candidates = mutableListOf<LineCandidate>()
        vertebrae.forEach { (name, node) ->
            val corners = node.corners ?: return@forEach
            corners.topLeft?.toPoint()?.let { tl ->
                corners.topRight?.toPoint()?.let { tr ->
                    candidates += LineCandidate("$name-Top", tl, tr, lineAngleDegrees(tl, tr))
                }
            }
            corners.bottomLeft?.toPoint()?.let { bl ->
                corners.bottomRight?.toPoint()?.let { br ->
                    candidates += LineCandidate("$name-Bottom", bl, br, lineAngleDegrees(bl, br))
                }
            }
        }
        output[1] = if (candidates.size >= 2) {
            val bestPair = findBestCobbPair(candidates)
            if (bestPair != null) {
                val reference = if (abs(bestPair.first.angle) >= abs(bestPair.second.angle)) bestPair.first else bestPair.second
                ImageAnalysisMeasurement(
                    key = "ai_compute_ca",
                    type = "CA",
                    value = formatAngle(bestPair.third, signed = false),
                    points = listOf(reference.p1, reference.p2),
                    description = "Cobb角测量",
                    kind = AnalysisMeasurementKind.COMPUTED,
                    panelVisible = true,
                )
            } else {
                measurementPlaceholder("ai_compute_ca", "CA", "Cobb角测量")
            }
        } else {
            measurementPlaceholder("ai_compute_ca", "CA", "Cobb角测量")
        }

        return output
    }

    private fun angleMetricOrPlaceholder(
        key: String,
        type: String,
        description: String,
        start: MeasurementPoint?,
        end: MeasurementPoint?,
        signed: Boolean,
    ): ImageAnalysisMeasurement {
        if (start == null || end == null) {
            return measurementPlaceholder(key, type, description)
        }
        return ImageAnalysisMeasurement(
            key = key,
            type = type,
            value = formatAngle(lineAngleDegrees(start, end), signed = signed),
            points = listOf(start, end),
            description = description,
            kind = AnalysisMeasurementKind.COMPUTED,
            panelVisible = true,
        )
    }

    private fun measurementPlaceholder(
        key: String,
        type: String,
        description: String,
    ): ImageAnalysisMeasurement {
        return ImageAnalysisMeasurement(
            key = key,
            type = type,
            value = "--",
            points = emptyList(),
            description = description,
            kind = AnalysisMeasurementKind.COMPUTED,
            panelVisible = true,
        )
    }

    private fun lineAngleDegrees(start: MeasurementPoint, end: MeasurementPoint): Double {
        val raw = atan2(end.y - start.y, end.x - start.x) * 180.0 / PI
        var normalized = raw
        while (normalized <= -90.0) normalized += 180.0
        while (normalized > 90.0) normalized -= 180.0
        return normalized
    }

    private fun findBestCobbPair(candidates: List<LineCandidate>): Triple<LineCandidate, LineCandidate, Double>? {
        var best: Triple<LineCandidate, LineCandidate, Double>? = null
        for (i in 0 until candidates.lastIndex) {
            for (j in i + 1 until candidates.size) {
                val first = candidates[i]
                val second = candidates[j]
                val angle = acuteAngle(first.angle, second.angle)
                if (best == null || angle > best.third) {
                    best = Triple(first, second, angle)
                }
            }
        }
        return best
    }

    private fun acuteAngle(first: Double, second: Double): Double {
        var diff = abs(first - second)
        if (diff > 180.0) diff = 360.0 - diff
        if (diff > 90.0) diff = 180.0 - diff
        return diff
    }

    private fun formatAngle(value: Double, signed: Boolean): String {
        val rounded = ((value * 10.0).roundToInt() / 10.0)
        return if (signed) "${rounded}°" else "${abs(rounded)}°"
    }

    private fun formatDistanceValue(pxDistance: Double, calibration: CalibrationContext): String {
        val mmPerPx = calibration.mmPerPx()
        return if (mmPerPx != null) {
            val value = pxDistance * mmPerPx
            "${((value * 10.0).roundToInt() / 10.0)}mm"
        } else {
            "${((pxDistance * 10.0).roundToInt() / 10.0)}px"
        }
    }

    private fun AiPointNode.toPoint(): MeasurementPoint = MeasurementPoint(x = x, y = y)

    private fun AiVertebraCorners?.centerPoint(): MeasurementPoint? {
        val corners = this ?: return null
        corners.center?.toPoint()?.let { return it }
        val fourCorners = listOfNotNull(
            corners.topLeft?.toPoint(),
            corners.topRight?.toPoint(),
            corners.bottomLeft?.toPoint(),
            corners.bottomRight?.toPoint(),
        )
        if (fourCorners.isNotEmpty()) {
            return MeasurementPoint(
                x = fourCorners.map { it.x }.average(),
                y = fourCorners.map { it.y }.average(),
            )
        }
        val topMid = corners.topMid?.toPoint()
        val bottomMid = corners.bottomMid?.toPoint()
        if (topMid != null && bottomMid != null) {
            return MeasurementPoint(
                x = (topMid.x + bottomMid.x) / 2.0,
                y = (topMid.y + bottomMid.y) / 2.0,
            )
        }
        return null
    }

    private data class LineCandidate(
        val name: String,
        val p1: MeasurementPoint,
        val p2: MeasurementPoint,
        val angle: Double,
    )

    private data class CalibrationContext(
        val standardDistanceMm: Double?,
        val standardDistancePoints: List<MeasurementPoint>,
    ) {
        fun mmPerPx(): Double? {
            val mm = standardDistanceMm ?: return null
            if (standardDistancePoints.size < 2) return null
            val a = standardDistancePoints[0]
            val b = standardDistancePoints[1]
            val px = hypot(b.x - a.x, b.y - a.y)
            if (px <= 0.0) return null
            return mm / px
        }
    }
}

sealed interface RunAiDetectOutcome {
    data class Success(val measurements: List<ImageAnalysisMeasurement>) : RunAiDetectOutcome
    data class Failure(val message: String) : RunAiDetectOutcome
}
