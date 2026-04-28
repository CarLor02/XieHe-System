package com.xiehe.spine.ui.components.analysis.viewer.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitTouchSlopOrCancellation
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.canvas.tools.isMoveTool
import com.xiehe.spine.ui.components.analysis.viewer.canvas.tools.supportsDoubleTapFinish
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.hitTest.findNearestDraggableAnnotationPoint
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.hitTest.hitTestEditableAuxiliaryAnnotation
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers.ImageLayer
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers.LabelLayer
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers.MeasurementLayer
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers.PreviewLayer
import com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.state.rememberAnnotationCanvasViewportState
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun AnnotationCanvas(
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
    onMeasurementPointDrag: (String, Int, MeasurementPoint) -> Unit = { _, _, _ -> },
    onAuxiliaryAnnotationLongPress: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .clipToBounds()
            .background(colors.backgroundElevated),
    ) {
        val maxWidthPx = constraints.maxWidth
        val maxHeightPx = constraints.maxHeight
        val containerWidthPx = constraints.maxWidth.toFloat()
        val containerHeightPx = constraints.maxHeight.toFloat()
        val visibleMeasurements = remember(measurements, hiddenKeys) {
            measurements.filterNot { hiddenKeys.contains(it.key) }
        }
        val viewportState = rememberAnnotationCanvasViewportState(
            bitmap = bitmap,
            zoomPercent = zoomPercent,
            contrast = contrast,
            brightness = brightness,
            isImageLocked = isImageLocked,
            containerWidthPx = containerWidthPx,
            containerHeightPx = containerHeightPx,
            maxWidthPx = maxWidthPx,
            maxHeightPx = maxHeightPx,
        )
        val currentMapScreenToImagePoint by rememberUpdatedState(viewportState.mapScreenToImagePoint)
        val currentOnTransformGesture by rememberUpdatedState(viewportState.onTransformGesture)
        val currentOnCanvasTap by rememberUpdatedState(onCanvasTap)
        val currentOnCanvasDoubleTap by rememberUpdatedState(onCanvasDoubleTap)
        val currentOnMeasurementPointDrag by rememberUpdatedState(onMeasurementPointDrag)
        val currentOnAuxiliaryAnnotationLongPress by rememberUpdatedState(onAuxiliaryAnnotationLongPress)
        val currentVisibleMeasurements by rememberUpdatedState(visibleMeasurements)
        val moveToolActive = remember(activeToolId) { isMoveTool(activeToolId) }
        val doubleTapFinishEnabled = remember(activeToolId) { supportsDoubleTapFinish(activeToolId) }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(
                    bitmap,
                    activeToolId,
                    viewportState.renderedScale,
                    viewportState.imageWidthPx,
                    viewportState.imageHeightPx,
                ) {
                    detectTapGestures(
                        onTap = { offset ->
                            if (bitmap == null || moveToolActive) return@detectTapGestures
                            val point = currentMapScreenToImagePoint(offset) ?: return@detectTapGestures
                            currentOnCanvasTap(point)
                        },
                        onLongPress = longPress@{ offset ->
                            val image = bitmap ?: return@longPress
                            val point = currentMapScreenToImagePoint(offset) ?: return@longPress
                            val measurementKey = hitTestEditableAuxiliaryAnnotation(
                                touchImagePoint = point,
                                measurements = currentVisibleMeasurements,
                                sx = viewportState.imageWidthPx / image.width,
                                sy = viewportState.imageHeightPx / image.height,
                                imageScale = viewportState.renderedScale,
                            ) ?: return@longPress
                            currentOnAuxiliaryAnnotationLongPress(measurementKey)
                        },
                        onDoubleTap = {
                            if (doubleTapFinishEnabled) {
                                currentOnCanvasDoubleTap()
                            }
                        },
                    )
                }
                .pointerInput(
                    bitmap,
                    viewportState.renderedScale,
                    viewportState.imageWidthPx,
                    viewportState.imageHeightPx,
                    activeToolId,
                ) {
                    val image = bitmap ?: return@pointerInput
                    awaitEachGesture {
                        val down = awaitFirstDown(requireUnconsumed = false)
                        val imagePoint = currentMapScreenToImagePoint(down.position)
                            ?: return@awaitEachGesture
                        val target = findNearestDraggableAnnotationPoint(
                            touchImagePoint = imagePoint,
                            measurements = currentVisibleMeasurements,
                            sx = viewportState.imageWidthPx / image.width,
                            sy = viewportState.imageHeightPx / image.height,
                            renderedScale = viewportState.renderedScale,
                        )
                            ?: return@awaitEachGesture

                        val slopChange = awaitTouchSlopOrCancellation(down.id) { change, _ ->
                            change.consume()
                        } ?: return@awaitEachGesture

                        currentMapScreenToImagePoint(slopChange.position)?.let { point ->
                            currentOnMeasurementPointDrag(
                                target.measurementKey,
                                target.pointIndex,
                                point,
                            )
                        }

                        drag(slopChange.id) { change ->
                            val point = currentMapScreenToImagePoint(change.position)
                                ?: return@drag
                            change.consume()
                            currentOnMeasurementPointDrag(
                                target.measurementKey,
                                target.pointIndex,
                                point,
                            )
                        }
                    }
                }
                .pointerInput(bitmap, isImageLocked) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        currentOnTransformGesture(pan, zoom)
                    }
                },
            contentAlignment = Alignment.Center,
        ) {
            if (bitmap == null || viewportState.imageSize == null) {
                Text(
                    text = "影像加载中...",
                    style = SpineTheme.typography.body,
                    color = colors.textTertiary,
                )
                return@Box
            }

            val sx = viewportState.imageWidthPx / bitmap.width
            val sy = viewportState.imageHeightPx / bitmap.height
            Box(
                modifier = Modifier
                    .size(viewportState.imageSize)
                    .graphicsLayer {
                        scaleX = viewportState.renderedScale
                        scaleY = viewportState.renderedScale
                        translationX = viewportState.panOffset.x
                        translationY = viewportState.panOffset.y
                    },
            ) {
                ImageLayer(
                    bitmap = bitmap,
                    colorFilter = viewportState.colorFilter,
                )
                MeasurementLayer(
                    measurements = visibleMeasurements,
                    sx = sx,
                    sy = sy,
                    toolColors = colors.annotationTools,
                )
                PreviewLayer(
                    pendingPoints = pendingPoints,
                    sx = sx,
                    sy = sy,
                    draftColor = colors.annotationTools.draft,
                )
                LabelLayer(
                    measurements = visibleMeasurements,
                    pendingPoints = pendingPoints,
                    sx = sx,
                    sy = sy,
                    imageScale = viewportState.renderedScale,
                )
            }
        }
    }
}
