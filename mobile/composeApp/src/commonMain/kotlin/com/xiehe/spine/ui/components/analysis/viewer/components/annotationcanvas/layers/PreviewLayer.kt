package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import com.xiehe.spine.data.measurement.MeasurementPoint
import androidx.compose.ui.graphics.Color

@Composable
fun PreviewLayer(
    pendingPoints: List<MeasurementPoint>,
    sx: Float,
    sy: Float,
    draftColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val previewPoints = pendingPoints.map { point ->
            Offset(
                x = (point.x * sx).toFloat(),
                y = (point.y * sy).toFloat(),
            )
        }

        previewPoints.forEachIndexed { index, point ->
            drawCircle(
                color = draftColor,
                radius = 5.4f,
                center = point,
            )
            if (index > 0) {
                drawLine(
                    color = draftColor.copy(alpha = 0.86f),
                    start = previewPoints[index - 1],
                    end = point,
                    strokeWidth = 2.2f,
                )
            }
        }
    }
}
