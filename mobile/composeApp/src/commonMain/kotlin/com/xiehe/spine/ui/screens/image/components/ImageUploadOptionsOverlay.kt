package com.xiehe.spine.ui.screens.image.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.components.form.picker.PickerDialog
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.ImageCropArea
import com.xiehe.spine.ui.viewmodel.image.UploadFilePayload
import org.jetbrains.compose.resources.decodeToImageBitmap

private val defaultCropArea = ImageCropArea(
    x = 0.06f,
    y = 0.04f,
    width = 0.88f,
    height = 0.9f,
)

private enum class CropHandle {
    MOVE,
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
}

@Composable
fun ImageUploadOptionsOverlay(
    file: UploadFilePayload,
    examTypes: List<ImageCategory>,
    onExamTypeChange: (ImageCategory) -> Unit,
    onFlip: () -> Unit,
    onCrop: (ImageCropArea) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    var pickingExamType by remember { mutableStateOf(false) }
    var cropMode by remember(file.id) { mutableStateOf(false) }
    var cropArea by remember(file.id) { mutableStateOf(defaultCropArea) }
    val colors = SpineTheme.colors
    val bitmap = remember(file.sourceBytes) {
        runCatching { file.sourceBytes.decodeToImageBitmap() }.getOrNull()
    }
    val bodyScroll = rememberScrollState()

    fun applyCropIfNeeded() {
        if (cropMode) {
            onCrop(cropArea)
            cropMode = false
        }
    }

    PickerDialog(
        title = "检查影像",
        onDismissRequest = onDismiss,
        showActionRow = false,
        maxDialogHeightFraction = 0.94f,
        edgeToEdge = true,
        roundBottomCorners = true,
    ) { dismiss ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(bodyScroll),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    text = "确认影像信息并进行必要调整",
                    style = SpineTheme.typography.body,
                    color = colors.textSecondary,
                )

                UploadImagePreview(
                    fileName = file.name,
                    bitmap = bitmap,
                    cropMode = cropMode,
                    cropArea = cropArea,
                    onCropAreaChange = { cropArea = it },
                )

                OptionRow(
                    label = "影像类型",
                    value = file.examType.label,
                    onClick = { pickingExamType = true },
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    ActionTextButton(
                        text = "⇄ 左右翻转${if (file.flipped) "（已翻转）" else ""}",
                        onClick = onFlip,
                        modifier = Modifier.weight(1f),
                    )
                    ActionTextButton(
                        text = if (cropMode) "应用裁剪" else "裁剪影像${if (file.cropped) "（已裁剪）" else ""}",
                        onClick = {
                            if (cropMode) {
                                applyCropIfNeeded()
                            } else {
                                cropMode = true
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ActionTextButton(
                    text = "取消",
                    onClick = dismiss,
                    modifier = Modifier.weight(1f),
                    muted = true,
                )
                ActionTextButton(
                    text = "确认",
                    onClick = {
                        applyCropIfNeeded()
                        onConfirm()
                        dismiss()
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }

    if (pickingExamType) {
        OptionPickerOverlay(
            title = "选择影像类别",
            options = examTypes.map { it.label },
            selected = file.examType.label,
            onDismiss = { pickingExamType = false },
            onSelect = { selectedLabel ->
                examTypes.firstOrNull { it.label == selectedLabel }?.let(onExamTypeChange)
            },
        )
    }
}

@Composable
private fun UploadImagePreview(
    fileName: String,
    bitmap: ImageBitmap?,
    cropMode: Boolean,
    cropArea: ImageCropArea,
    onCropAreaChange: (ImageCropArea) -> Unit,
) {
    val colors = SpineTheme.colors
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val imageHeight = if (bitmap != null) {
            val aspectRatio = (bitmap.width.toFloat() / bitmap.height.toFloat()).coerceAtLeast(0.1f)
            minOf(320.dp, maxWidth / aspectRatio)
        } else {
            220.dp
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(imageHeight)
                .clip(RoundedCornerShape(SpineTheme.radius.lg))
                .background(colors.textPrimary),
            contentAlignment = Alignment.Center,
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap,
                    contentDescription = fileName,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit,
                )
                if (cropMode) {
                    CropSelectionOverlay(
                        cropArea = cropArea,
                        onCropAreaChange = onCropAreaChange,
                    )
                }
            } else {
                Text(
                    text = "当前文件无法直接预览",
                    style = SpineTheme.typography.body,
                    color = colors.onPrimary.copy(alpha = 0.72f),
                )
            }
            Text(
                text = fileName,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp)
                    .background(
                        color = colors.textPrimary.copy(alpha = 0.38f),
                        shape = RoundedCornerShape(SpineTheme.radius.sm),
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = colors.onPrimary,
            )
        }
    }
}

@Composable
private fun CropSelectionOverlay(
    cropArea: ImageCropArea,
    onCropAreaChange: (ImageCropArea) -> Unit,
) {
    val colors = SpineTheme.colors
    val density = LocalDensity.current
    var overlaySize by remember { mutableStateOf(IntSize.Zero) }
    val latestCropArea by rememberUpdatedState(cropArea)
    val latestOnCropAreaChange by rememberUpdatedState(onCropAreaChange)

    fun Modifier.cropDrag(handle: CropHandle): Modifier {
        return pointerInput(handle, overlaySize) {
            var startCrop = latestCropArea
            var accumulatedDrag = Offset.Zero
            detectDragGestures(
                onDragStart = {
                    startCrop = latestCropArea
                    accumulatedDrag = Offset.Zero
                },
                onDrag = { change, dragAmount ->
                    change.consume()
                    val width = overlaySize.width.takeIf { it > 0 } ?: return@detectDragGestures
                    val height = overlaySize.height.takeIf { it > 0 } ?: return@detectDragGestures
                    accumulatedDrag += dragAmount
                    latestOnCropAreaChange(
                        startCrop.adjust(
                            handle = handle,
                            dx = accumulatedDrag.x / width,
                            dy = accumulatedDrag.y / height,
                        ),
                    )
                },
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.textPrimary.copy(alpha = 0.28f))
            .onSizeChanged { overlaySize = it },
    ) {
        if (overlaySize.width <= 0 || overlaySize.height <= 0) return@Box
        val left = with(density) { (cropArea.x * overlaySize.width).toDp() }
        val top = with(density) { (cropArea.y * overlaySize.height).toDp() }
        val width = with(density) { (cropArea.width * overlaySize.width).toDp() }
        val height = with(density) { (cropArea.height * overlaySize.height).toDp() }

        Box(
            modifier = Modifier
                .padding(start = left, top = top)
                .size(width = width, height = height)
                .background(colors.primary.copy(alpha = 0.12f))
                .border(2.dp, colors.primary, RoundedCornerShape(2.dp))
                .cropDrag(CropHandle.MOVE),
        ) {
            CropResizeHandle(
                alignment = Alignment.TopStart,
                handle = CropHandle.TOP_LEFT,
                dragModifier = Modifier.cropDrag(CropHandle.TOP_LEFT),
            )
            CropResizeHandle(
                alignment = Alignment.TopEnd,
                handle = CropHandle.TOP_RIGHT,
                dragModifier = Modifier.cropDrag(CropHandle.TOP_RIGHT),
            )
            CropResizeHandle(
                alignment = Alignment.BottomStart,
                handle = CropHandle.BOTTOM_LEFT,
                dragModifier = Modifier.cropDrag(CropHandle.BOTTOM_LEFT),
            )
            CropResizeHandle(
                alignment = Alignment.BottomEnd,
                handle = CropHandle.BOTTOM_RIGHT,
                dragModifier = Modifier.cropDrag(CropHandle.BOTTOM_RIGHT),
            )
        }
    }
}

@Composable
private fun BoxScope.CropResizeHandle(
    alignment: Alignment,
    handle: CropHandle,
    dragModifier: Modifier,
) {
    val handleRadius = 11.dp
    val handleOffsetX = when (handle) {
        CropHandle.TOP_LEFT,
        CropHandle.BOTTOM_LEFT -> -handleRadius
        CropHandle.TOP_RIGHT,
        CropHandle.BOTTOM_RIGHT -> handleRadius
        CropHandle.MOVE -> 0.dp
    }
    val handleOffsetY = when (handle) {
        CropHandle.TOP_LEFT,
        CropHandle.TOP_RIGHT -> -handleRadius
        CropHandle.BOTTOM_LEFT,
        CropHandle.BOTTOM_RIGHT -> handleRadius
        CropHandle.MOVE -> 0.dp
    }

    Box(
        modifier = Modifier
            .align(alignment)
            .offset(x = handleOffsetX, y = handleOffsetY)
            .size(22.dp)
            .clip(RoundedCornerShape(11.dp))
            .background(SpineTheme.colors.primary)
            .border(2.dp, SpineTheme.colors.onPrimary, RoundedCornerShape(11.dp))
            .then(dragModifier),
    )
}

private fun ImageCropArea.adjust(
    handle: CropHandle,
    dx: Float,
    dy: Float,
): ImageCropArea {
    val minSize = 0.08f
    return when (handle) {
        CropHandle.MOVE -> copy(
            x = (x + dx).coerceIn(0f, 1f - width),
            y = (y + dy).coerceIn(0f, 1f - height),
        )

        CropHandle.TOP_LEFT -> {
            val right = x + width
            val bottom = y + height
            val nextX = (x + dx).coerceIn(0f, right - minSize)
            val nextY = (y + dy).coerceIn(0f, bottom - minSize)
            ImageCropArea(nextX, nextY, right - nextX, bottom - nextY)
        }

        CropHandle.TOP_RIGHT -> {
            val bottom = y + height
            val nextY = (y + dy).coerceIn(0f, bottom - minSize)
            val nextWidth = (width + dx).coerceIn(minSize, 1f - x)
            ImageCropArea(x, nextY, nextWidth, bottom - nextY)
        }

        CropHandle.BOTTOM_LEFT -> {
            val right = x + width
            val nextX = (x + dx).coerceIn(0f, right - minSize)
            val nextHeight = (height + dy).coerceIn(minSize, 1f - y)
            ImageCropArea(nextX, y, right - nextX, nextHeight)
        }

        CropHandle.BOTTOM_RIGHT -> copy(
            width = (width + dx).coerceIn(minSize, 1f - x),
            height = (height + dy).coerceIn(minSize, 1f - y),
        )
    }
}

@Composable
private fun OptionRow(
    label: String,
    value: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(SpineTheme.radius.lg))
            .background(SpineTheme.colors.surfaceMuted)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.textSecondary,
        )
        Text(
            text = value,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.primary,
        )
    }
}

@Composable
private fun ActionTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    muted: Boolean = false,
) {
    val colors = SpineTheme.colors
    Text(
        text = text,
        modifier = modifier
            .clip(RoundedCornerShape(SpineTheme.radius.md))
            .background(if (muted) colors.surfaceMuted else colors.primaryMuted)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 11.dp),
        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
        color = if (muted) colors.textSecondary else colors.primary,
    )
}
