package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.sp
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurementKind
import com.xiehe.spine.ui.components.analysis.viewer.domain.calculateSmartTagPosition
import com.xiehe.spine.ui.components.analysis.viewer.domain.formatAuxiliaryTag
import com.xiehe.spine.ui.components.analysis.viewer.domain.formatMeasurementTag
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveAnnotationColor
import com.xiehe.spine.ui.components.analysis.viewer.domain.resolveMeasurementTagAnchor
import com.xiehe.spine.ui.components.analysis.viewer.domain.shouldShowAuxiliaryShapeTag
import com.xiehe.spine.ui.components.analysis.viewer.domain.shouldShowMetricTag
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import kotlin.math.roundToInt

@Composable
fun LabelLayer(
    measurements: List<AnnotationMeasurement>,
    pendingPoints: List<MeasurementPoint>,
    sx: Float,
    sy: Float,
    imageScale: Float,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val toolColors = colors.annotationTools
    val occupiedLabelPositions = mutableListOf<Offset>()

    Box(modifier = modifier.fillMaxSize()) {
        measurements.forEach { measurement ->
            if (measurement.kind == AnnotationMeasurementKind.DETECTED) {
                val point = measurement.points.firstOrNull() ?: return@forEach
                val pointLabel = measurement.pointLabel ?: return@forEach
                val x = (point.x * sx).toFloat()
                val y = (point.y * sy).toFloat()
                Text(
                    text = pointLabel,
                    style = SpineTheme.typography.caption.copy(fontSize = 8.sp),
                    color = toolColors.detectedPoint,
                    modifier = Modifier.offset {
                        IntOffset(
                            x = (x + 6f).roundToInt(),
                            y = (y - 14f).roundToInt(),
                        )
                    },
                    maxLines = 1,
                )
            }

            if (shouldShowMetricTag(measurement)) {
                RenderOutlinedTag(
                    text = formatMeasurementTag(measurement),
                    baseAnchor = resolveMeasurementTagAnchor(measurement, sx, sy, imageScale),
                    occupiedLabelPositions = occupiedLabelPositions,
                    color = resolveAnnotationColor(measurement, toolColors),
                    imageScale = imageScale,
                )
            }

            if (shouldShowAuxiliaryShapeTag(measurement)) {
                RenderOutlinedTag(
                    text = formatAuxiliaryTag(measurement),
                    baseAnchor = resolveMeasurementTagAnchor(measurement, sx, sy, imageScale),
                    occupiedLabelPositions = occupiedLabelPositions,
                    color = resolveAnnotationColor(measurement, toolColors),
                    imageScale = imageScale,
                )
            }
        }

        pendingPoints.forEachIndexed { index, point ->
            val x = (point.x * sx).toFloat()
            val y = (point.y * sy).toFloat()
            Text(
                text = "${index + 1}",
                style = SpineTheme.typography.caption.copy(fontSize = 9.sp),
                color = toolColors.draft,
                modifier = Modifier.offset {
                    IntOffset(
                        x = (x + 8f).roundToInt(),
                        y = (y - 16f).roundToInt(),
                    )
                },
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun RenderOutlinedTag(
    text: String,
    baseAnchor: Offset,
    occupiedLabelPositions: MutableList<Offset>,
    color: Color,
    imageScale: Float,
) {
    val tagPosition = calculateSmartTagPosition(baseAnchor, occupiedLabelPositions, imageScale)
    occupiedLabelPositions += tagPosition
    val fontSize = MEASUREMENT_TAG_FONT_SIZE
    val estimatedHalfWidth = (text.length * fontSize * 0.28f).roundToInt()
    val estimatedTopOffset = fontSize.roundToInt()
    val textOffset = IntOffset(
        x = tagPosition.x.roundToInt() - estimatedHalfWidth,
        y = tagPosition.y.roundToInt() - estimatedTopOffset,
    )

    OutlinedMeasurementTag(
        text = text,
        fontSize = fontSize,
        color = color,
        offset = textOffset,
    )
}

@Composable
private fun OutlinedMeasurementTag(
    text: String,
    fontSize: Float,
    color: Color,
    offset: IntOffset,
) {
    val outlineOffsets = listOf(
        IntOffset(-1, -1),
        IntOffset(-1, 0),
        IntOffset(-1, 1),
        IntOffset(0, -1),
        IntOffset(0, 1),
        IntOffset(1, -1),
        IntOffset(1, 0),
        IntOffset(1, 1),
    )

    outlineOffsets.forEach { outlineOffset ->
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontSize = fontSize.sp),
            color = Color.Black,
            modifier = Modifier.offset {
                IntOffset(
                    x = offset.x + outlineOffset.x,
                    y = offset.y + outlineOffset.y,
                )
            },
            maxLines = 1,
        )
    }

    Text(
        text = text,
        style = SpineTheme.typography.caption.copy(fontSize = fontSize.sp),
        color = color,
        modifier = Modifier.offset { offset },
        maxLines = 1,
    )
}

private const val MEASUREMENT_TAG_FONT_SIZE = 5.5f
