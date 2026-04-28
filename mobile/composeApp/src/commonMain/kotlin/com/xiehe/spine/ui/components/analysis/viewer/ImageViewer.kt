package com.xiehe.spine.ui.components.analysis.viewer

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.components.AnnotationCanvas

@Composable
fun ImageViewer(
    bitmap: ImageBitmap?,
    measurements: List<AnnotationMeasurement>,
    hiddenKeys: Set<String>,
    activeToolId: String,
    pendingPoints: List<MeasurementPoint>,
    isImageLocked: Boolean,
    zoomPercent: Float,
    contrast: Int,
    brightness: Int,
    onCanvasTap: (MeasurementPoint) -> Unit,
    onCanvasDoubleTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnnotationCanvas(
        bitmap = bitmap,
        measurements = measurements,
        hiddenKeys = hiddenKeys,
        activeToolId = activeToolId,
        pendingPoints = pendingPoints,
        isImageLocked = isImageLocked,
        zoomPercent = zoomPercent,
        contrast = contrast,
        brightness = brightness,
        onCanvasTap = onCanvasTap,
        onCanvasDoubleTap = onCanvasDoubleTap,
        modifier = modifier,
    )
}
