package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.DpSize
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.canvas.transform.clampPanOffset
import com.xiehe.spine.ui.components.analysis.viewer.canvas.transform.computeFitSize
import com.xiehe.spine.ui.components.analysis.viewer.canvas.transform.screenToImagePoint

@Stable
data class AnnotationCanvasViewportState(
    val renderedScale: Float,
    val panOffset: Offset,
    val imageSize: DpSize?,
    val imageWidthPx: Float,
    val imageHeightPx: Float,
    val colorFilter: ColorFilter?,
    val mapScreenToImagePoint: (Offset) -> MeasurementPoint?,
    val onTransformGesture: (Offset, Float) -> Unit,
)

@Composable
fun rememberAnnotationCanvasViewportState(
    bitmap: ImageBitmap?,
    zoomPercent: Float,
    contrast: Int,
    brightness: Int,
    isImageLocked: Boolean,
    containerWidthPx: Float,
    containerHeightPx: Float,
    maxWidthPx: Int,
    maxHeightPx: Int,
): AnnotationCanvasViewportState = key(bitmap) {
    var gestureScale by remember { mutableFloatStateOf(1f) }
    var panOffset by remember { mutableStateOf(Offset.Zero) }
    val renderedScale = maxOf(1f, (zoomPercent / 100f) * gestureScale)
    val density = LocalDensity.current
    val imageSize = remember(bitmap, maxWidthPx, maxHeightPx, density.density) {
        bitmap?.let {
            computeFitSize(
                bitmapWidth = it.width,
                bitmapHeight = it.height,
                maxWidth = maxWidthPx,
                maxHeight = maxHeightPx,
                density = density,
            )
        }
    }
    val imageWidthPx = imageSize?.let { with(density) { it.width.toPx() } } ?: 0f
    val imageHeightPx = imageSize?.let { with(density) { it.height.toPx() } } ?: 0f
    val colorFilter = remember(contrast, brightness) {
        ColorFilter.colorMatrix(createAdjustMatrix(contrast = contrast, brightness = brightness))
    }

    LaunchedEffect(bitmap, renderedScale, containerWidthPx, containerHeightPx, imageWidthPx, imageHeightPx) {
        if (bitmap == null || imageWidthPx <= 0f || imageHeightPx <= 0f) return@LaunchedEffect
        val clamped = clampPanOffset(
            pan = panOffset,
            renderedScale = renderedScale,
            baseImageWidthPx = imageWidthPx,
            baseImageHeightPx = imageHeightPx,
            containerWidthPx = containerWidthPx,
            containerHeightPx = containerHeightPx,
        )
        if (clamped != panOffset) {
            panOffset = clamped
        }
    }

    AnnotationCanvasViewportState(
        renderedScale = renderedScale,
        panOffset = panOffset,
        imageSize = imageSize,
        imageWidthPx = imageWidthPx,
        imageHeightPx = imageHeightPx,
        colorFilter = colorFilter,
        mapScreenToImagePoint = fun(tapOffset: Offset): MeasurementPoint? {
            val image = bitmap ?: return null
            return screenToImagePoint(
                tapOffset = tapOffset,
                imageWidth = image.width,
                imageHeight = image.height,
                containerWidthPx = containerWidthPx,
                containerHeightPx = containerHeightPx,
                panOffset = panOffset,
                totalScale = renderedScale,
                baseImageWidthPx = imageWidthPx,
                baseImageHeightPx = imageHeightPx,
            )
        },
        onTransformGesture = fun(pan: Offset, zoom: Float) {
            if (isImageLocked || bitmap == null || imageWidthPx <= 0f || imageHeightPx <= 0f) {
                return
            }

            val nextGestureScale = (gestureScale * zoom).coerceIn(0.4f, 6f)
            val nextRenderedScale = maxOf(1f, (zoomPercent / 100f) * nextGestureScale)
            gestureScale = nextGestureScale
            panOffset = clampPanOffset(
                pan = panOffset + pan,
                renderedScale = nextRenderedScale,
                baseImageWidthPx = imageWidthPx,
                baseImageHeightPx = imageHeightPx,
                containerWidthPx = containerWidthPx,
                containerHeightPx = containerHeightPx,
            )
        },
    )
}

private fun createAdjustMatrix(
    contrast: Int,
    brightness: Int,
): ColorMatrix {
    val c = 1f + (contrast / 100f)
    val b = brightness / 255f * 255f
    return ColorMatrix(
        floatArrayOf(
            c, 0f, 0f, 0f, b,
            0f, c, 0f, 0f, b,
            0f, 0f, c, 0f, b,
            0f, 0f, 0f, 1f, 0f,
        ),
    )
}
