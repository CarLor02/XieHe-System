package com.xiehe.spine.ui.components.analysis.viewer.canvas.transform

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.DpSize
import com.xiehe.spine.data.measurement.MeasurementPoint

fun computeFitSize(
    bitmapWidth: Int,
    bitmapHeight: Int,
    maxWidth: Int,
    maxHeight: Int,
    density: Density,
): DpSize {
    val widthScale = maxWidth / bitmapWidth.toFloat()
    val heightScale = maxHeight / bitmapHeight.toFloat()
    val scale = minOf(widthScale, heightScale)
    return with(density) {
        DpSize(
            width = (bitmapWidth * scale).toDp(),
            height = (bitmapHeight * scale).toDp(),
        )
    }
}

fun screenToImagePoint(
    tapOffset: Offset,
    imageWidth: Int,
    imageHeight: Int,
    containerWidthPx: Float,
    containerHeightPx: Float,
    panOffset: Offset,
    totalScale: Float,
    baseImageWidthPx: Float,
    baseImageHeightPx: Float,
): MeasurementPoint? {
    if (baseImageWidthPx <= 0f || baseImageHeightPx <= 0f) return null

    val imageWidthPx = baseImageWidthPx
    val imageHeightPx = baseImageHeightPx
    val centerX = containerWidthPx / 2f
    val centerY = containerHeightPx / 2f
    val topLeftX = centerX - imageWidthPx / 2f
    val topLeftY = centerY - imageHeightPx / 2f

    val localX = tapOffset.x - topLeftX - panOffset.x
    val localY = tapOffset.y - topLeftY - panOffset.y
    val imageCenterX = imageWidthPx / 2f
    val imageCenterY = imageHeightPx / 2f
    val unscaledX = (localX - imageCenterX) / totalScale + imageCenterX
    val unscaledY = (localY - imageCenterY) / totalScale + imageCenterY
    if (unscaledX < 0f || unscaledY < 0f || unscaledX > imageWidthPx || unscaledY > imageHeightPx) {
        return null
    }

    return MeasurementPoint(
        x = (unscaledX / imageWidthPx * imageWidth.toFloat()).toDouble(),
        y = (unscaledY / imageHeightPx * imageHeight.toFloat()).toDouble(),
    )
}

fun clampPanOffset(
    pan: Offset,
    renderedScale: Float,
    baseImageWidthPx: Float,
    baseImageHeightPx: Float,
    containerWidthPx: Float,
    containerHeightPx: Float,
): Offset {
    val scaledWidth = baseImageWidthPx * renderedScale
    val scaledHeight = baseImageHeightPx * renderedScale
    val maxX = ((scaledWidth - containerWidthPx) / 2f).coerceAtLeast(0f)
    val maxY = ((scaledHeight - containerHeightPx) / 2f).coerceAtLeast(0f)
    return Offset(
        x = pan.x.coerceIn(-maxX, maxX),
        y = pan.y.coerceIn(-maxY, maxY),
    )
}
