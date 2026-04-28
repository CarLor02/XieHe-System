package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.ImageViewer
import com.xiehe.spine.ui.viewmodel.image.ImageAnalysisMeasurement

@Composable
fun ImageViewport(
    bitmap: ImageBitmap?,
    measurements: List<ImageAnalysisMeasurement>,
    hiddenKeys: Set<String>,
    activeToolId: String,
    pendingPoints: List<MeasurementPoint>,
    isImageLocked: Boolean,
    zoomPercent: Float,
    contrast: Int,
    brightness: Int,
    onCanvasTap: (MeasurementPoint) -> Unit,
    onCanvasDoubleTap: () -> Unit,
    onMeasurementPointDrag: (String, Int, MeasurementPoint) -> Unit = { _, _, _ -> },
    onAuxiliaryAnnotationLongPress: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    ImageViewer(
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
        onMeasurementPointDrag = onMeasurementPointDrag,
        onAuxiliaryAnnotationLongPress = onAuxiliaryAnnotationLongPress,
        modifier = modifier,
    )
}
