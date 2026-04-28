package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.renderers.drawAnnotationMeasurement
import com.xiehe.spine.ui.theme.SpineAnnotationToolColors

@Composable
fun MeasurementLayer(
    measurements: List<AnnotationMeasurement>,
    sx: Float,
    sy: Float,
    toolColors: SpineAnnotationToolColors,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        measurements.forEach { measurement ->
            drawAnnotationMeasurement(
                item = measurement,
                sx = sx,
                sy = sy,
                toolColors = toolColors,
            )
        }
    }
}
