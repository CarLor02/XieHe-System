package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.GenerateReportMeasurementItem
import com.xiehe.spine.data.measurement.ImageMeasurementItem
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.data.measurement.SaveMeasurementItem
import com.xiehe.spine.ui.components.analysis.viewer.domain.DEFAULT_STANDARD_DISTANCE_MM
import kotlin.math.roundToInt
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive

object AnnotationPersistenceMapper {
    fun imageMeasurementToUiMeasurement(
        measurement: ImageMeasurementItem,
        index: Int,
    ): ImageAnalysisMeasurement {
        val valueFromField = measurement.value.jsonContent()
        val angleFromField = measurement.angle.jsonContent()
        val valueLabel = when {
            !valueFromField.isNullOrBlank() -> valueFromField
            !angleFromField.isNullOrBlank() -> {
                if (angleFromField.endsWith("°")) angleFromField else "${angleFromField}°"
            }

            else -> "--"
        }
        val rawId = measurement.id?.takeIf { it.isNotBlank() } ?: "${measurement.type}#$index"
        val (kind, label, panelVisible) = detectMeasurementKind(
            id = rawId,
            type = measurement.type,
            value = valueLabel,
            points = measurement.points,
        )
        return ImageAnalysisMeasurement(
            key = rawId,
            type = measurement.type,
            value = valueLabel,
            points = measurement.points,
            description = measurement.description,
            kind = kind,
            pointLabel = label,
            panelVisible = panelVisible,
        )
    }

    fun toSaveMeasurementItem(measurement: ImageAnalysisMeasurement): SaveMeasurementItem {
        if (measurement.kind == AnalysisMeasurementKind.COMPUTED) {
            return SaveMeasurementItem(
                id = measurement.key,
                type = measurement.type,
                value = measurement.value.takeUnless { it == "--" },
                points = measurement.points,
                description = measurement.description ?: defaultDescription(measurement.type),
            )
        }

        val label = measurement.pointLabel ?: measurement.type
        val normalizedLabel = label
            .removePrefix("AI检测-")
            .removePrefix("ai-detection-")
        val vertebraCorner = detectVertebraCornerLabel(normalizedLabel)
        return if (vertebraCorner != null) {
            val (vertebra, corner) = vertebraCorner
            val cornerCn = cornerCnLabel(corner)
            SaveMeasurementItem(
                id = "ai-detection-$vertebra-$corner",
                type = "AI检测-$vertebra-$corner",
                value = "$vertebra-$corner",
                points = measurement.points,
                description = "AI检测-${vertebra}角点${corner}($cornerCn) (置信度: ${formatConfidencePercent(measurement.confidence)})",
            )
        } else {
            SaveMeasurementItem(
                id = "ai-detection-pose-$normalizedLabel",
                type = "AI检测-$normalizedLabel",
                value = normalizedLabel,
                points = measurement.points,
                description = "AI检测-躯干关键点 (置信度: ${formatConfidencePercent(measurement.confidence)})",
            )
        }
    }

    fun toGenerateReportItem(measurement: ImageAnalysisMeasurement): GenerateReportMeasurementItem? {
        if (measurement.auxiliary) return null
        if (measurement.kind == AnalysisMeasurementKind.COMPUTED && measurement.value == "--") return null
        if (measurement.kind == AnalysisMeasurementKind.COMPUTED && measurement.type == "标准距离") return null

        if (measurement.kind == AnalysisMeasurementKind.DETECTED) {
            val label = measurement.pointLabel ?: measurement.type
            val normalizedLabel = label
                .removePrefix("AI检测-")
                .removePrefix("ai-detection-")
            val vertebraCorner = detectVertebraCornerLabel(normalizedLabel)
            return if (vertebraCorner != null) {
                val (vertebra, corner) = vertebraCorner
                val cornerCn = cornerCnLabel(corner)
                GenerateReportMeasurementItem(
                    description = "AI检测-${vertebra}角点${corner}($cornerCn) (置信度: ${formatConfidencePercent(measurement.confidence)})",
                    type = "AI检测-$vertebra-$corner",
                    value = "$vertebra-$corner",
                )
            } else {
                GenerateReportMeasurementItem(
                    description = "AI检测-躯干关键点 (置信度: ${formatConfidencePercent(measurement.confidence)})",
                    type = "AI检测-$normalizedLabel",
                    value = normalizedLabel,
                )
            }
        }

        return GenerateReportMeasurementItem(
            description = measurement.description ?: defaultDescription(measurement.type),
            type = measurement.type,
            value = measurement.value,
        )
    }

    fun buildExportSnapshot(
        state: ImageAnalysisUiState,
        savedAt: String,
    ): ExportAnnotationSnapshot {
        return ExportAnnotationSnapshot(
            imageId = state.fileId?.toString().orEmpty(),
            measurements = state.measurements.map { it.toExportItem() },
            standardDistance = state.standardDistanceMm,
            standardDistancePoints = state.standardDistancePoints,
            savedAt = savedAt,
        )
    }

    fun importSnapshot(snapshot: ExportAnnotationSnapshot): ImportedAnnotations {
        val measurements = snapshot.measurements.mapIndexed { index, item ->
            item.toUiMeasurement(index)
        }
        val standardDistance = snapshot.standardDistance?.takeIf { it > 0.0 } ?: DEFAULT_STANDARD_DISTANCE_MM
        val standardPoints = snapshot.standardDistancePoints.takeIf { it.size >= 2 } ?: DEFAULT_STANDARD_DISTANCE_POINTS
        return ImportedAnnotations(
            measurements = measurements,
            standardDistanceMm = standardDistance,
            standardDistancePoints = standardPoints,
        )
    }

    private fun JsonElement?.jsonContent(): String? {
        val primitive = this ?: return null
        return runCatching { primitive.jsonPrimitive.content }.getOrNull()
    }

    private fun detectMeasurementKind(
        id: String,
        type: String,
        value: String,
        points: List<MeasurementPoint>,
    ): Triple<AnalysisMeasurementKind, String?, Boolean> {
        val raw = when {
            type.startsWith("AI检测-") -> type.removePrefix("AI检测-")
            id.startsWith("ai-detection-pose-") -> id.removePrefix("ai-detection-pose-")
            id.startsWith("ai-detection-") -> id.removePrefix("ai-detection-")
            else -> value
        }.ifBlank { type }

        val isDetected = type.startsWith("AI检测-") || id.startsWith("ai-detection-")
        if (!isDetected) {
            return Triple(AnalysisMeasurementKind.COMPUTED, null, true)
        }

        val isPose = raw in ANALYSIS_POSE_PANEL_ORDER
        return Triple(
            AnalysisMeasurementKind.DETECTED,
            raw,
            isPose || raw.contains('-'),
        )
    }

    private fun detectVertebraCornerLabel(label: String): Pair<String, Int>? {
        val parts = label.split('-')
        if (parts.size != 2) return null
        val vertebra = parts[0]
        val corner = parts[1].toIntOrNull() ?: return null
        if (corner !in 1..4) return null
        return vertebra to corner
    }

    private fun cornerCnLabel(order: Int): String {
        return when (order) {
            1 -> "左上"
            2 -> "右上"
            3 -> "右下"
            4 -> "左下"
            else -> "-"
        }
    }

    private fun formatConfidencePercent(confidence: Double?): String {
        val value = confidence ?: return "--"
        val percent = if (value <= 1.0) value * 100.0 else value
        val rounded = ((percent * 10.0).roundToInt() / 10.0)
        return "${rounded}%"
    }

    private fun defaultDescription(type: String): String {
        return when {
            type.startsWith("AI检测", ignoreCase = true) -> "$type 自动检测结果"
            else -> "$type 测量"
        }
    }

    private fun ImageAnalysisMeasurement.toExportItem(): ExportMeasurementItem {
        return ExportMeasurementItem(
            id = key,
            type = type,
            value = value,
            points = points,
            description = description,
            kind = kind.name,
            pointLabel = pointLabel,
            confidence = confidence,
            panelVisible = panelVisible,
            helperSegments = helperSegments,
            auxiliary = auxiliary,
        )
    }

    private fun ExportMeasurementItem.toUiMeasurement(index: Int): ImageAnalysisMeasurement {
        val fallbackId = id?.takeIf { it.isNotBlank() } ?: "${type}#import#$index"
        val fallback = detectMeasurementKind(
            id = fallbackId,
            type = type,
            value = value ?: "--",
            points = points,
        )
        return ImageAnalysisMeasurement(
            key = fallbackId,
            type = type,
            value = value ?: "--",
            points = points,
            description = description,
            kind = kind?.let { runCatching { AnalysisMeasurementKind.valueOf(it) }.getOrNull() } ?: fallback.first,
            pointLabel = pointLabel ?: fallback.second,
            confidence = confidence,
            panelVisible = panelVisible ?: fallback.third,
            helperSegments = helperSegments ?: emptyList(),
            auxiliary = auxiliary ?: false,
        )
    }
}

data class ImportedAnnotations(
    val measurements: List<ImageAnalysisMeasurement>,
    val standardDistanceMm: Double,
    val standardDistancePoints: List<MeasurementPoint>,
)

@Serializable
data class ExportAnnotationSnapshot(
    val imageId: String,
    val imageWidth: Int? = null,
    val imageHeight: Int? = null,
    val measurements: List<ExportMeasurementItem>,
    val standardDistance: Double? = null,
    val standardDistancePoints: List<MeasurementPoint> = emptyList(),
    val savedAt: String,
)

@Serializable
data class ExportMeasurementItem(
    val id: String? = null,
    val type: String,
    val value: String? = null,
    val points: List<MeasurementPoint> = emptyList(),
    val description: String? = null,
    val kind: String? = null,
    val pointLabel: String? = null,
    val confidence: Double? = null,
    val panelVisible: Boolean? = null,
    val helperSegments: List<AnalysisHelperSegment>? = null,
    val auxiliary: Boolean? = null,
)
