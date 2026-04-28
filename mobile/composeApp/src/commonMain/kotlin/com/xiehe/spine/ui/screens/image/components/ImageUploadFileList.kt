package com.xiehe.spine.ui.screens.image.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.UploadFilePayload
import com.xiehe.spine.ui.viewmodel.image.UploadFileStatus
import org.jetbrains.compose.resources.decodeToImageBitmap

@Composable
fun ImageUploadFileList(
    files: List<UploadFilePayload>,
    onAdjust: (String) -> Unit,
    onRemove: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (files.isEmpty()) return

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "上传文件（${files.size}）",
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.textPrimary,
        )
        files.forEach { file ->
            ImageUploadFileRow(
                file = file,
                onAdjust = { onAdjust(file.id) },
                onRemove = { onRemove(file.id) },
            )
        }
    }
}

@Composable
private fun ImageUploadFileRow(
    file: UploadFilePayload,
    onAdjust: () -> Unit,
    onRemove: () -> Unit,
) {
    val colors = SpineTheme.colors
    val itemShape = RoundedCornerShape(SpineTheme.radius.lg)
    val bitmap = remember(file.bytes) {
        runCatching { file.bytes.decodeToImageBitmap() }.getOrNull()
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(itemShape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, itemShape)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .width(54.dp)
                .height(64.dp)
                .clip(RoundedCornerShape(SpineTheme.radius.md))
                .background(colors.textPrimary),
            contentAlignment = Alignment.Center,
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap,
                    contentDescription = file.name,
                    modifier = Modifier.size(54.dp, 64.dp),
                    contentScale = ContentScale.Fit,
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = file.name,
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
                maxLines = 1,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = file.status.label,
                    style = SpineTheme.typography.caption,
                    color = file.status.statusColor(),
                )
                FileInfoChip(text = file.examType.label, accent = colors.primary)
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = formatByteSize(file.bytes.size),
                    style = SpineTheme.typography.caption,
                    color = colors.textSecondary,
                )
                if (file.flipped) {
                    Text(
                        text = "已翻转",
                        style = SpineTheme.typography.caption,
                        color = colors.textSecondary,
                    )
                }
                if (file.cropped) {
                    Text(
                        text = "已裁剪",
                        style = SpineTheme.typography.caption,
                        color = colors.textSecondary,
                    )
                }
            }
        }

        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ListActionText(text = "调整", onClick = onAdjust)
            ListActionText(text = "移除", onClick = onRemove, destructive = true)
        }
    }
}

@Composable
private fun FileInfoChip(
    text: String,
    accent: Color,
) {
    Text(
        text = text,
        modifier = Modifier
            .clip(RoundedCornerShape(SpineTheme.radius.sm))
            .background(accent.copy(alpha = 0.12f))
            .padding(horizontal = 7.dp, vertical = 2.dp),
        style = SpineTheme.typography.caption,
        color = accent,
    )
}

@Composable
private fun ListActionText(
    text: String,
    onClick: () -> Unit,
    destructive: Boolean = false,
) {
    val colors = SpineTheme.colors
    Text(
        text = text,
        modifier = Modifier
            .clip(RoundedCornerShape(SpineTheme.radius.md))
            .background(if (destructive) colors.destructiveMuted else colors.primaryMuted)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
        color = if (destructive) colors.destructive else colors.primary,
    )
}

@Composable
private fun UploadFileStatus.statusColor(): Color {
    val colors = SpineTheme.colors
    return when (this) {
        UploadFileStatus.PENDING -> colors.textSecondary
        UploadFileStatus.UPLOADING -> colors.primary
        UploadFileStatus.COMPLETED -> colors.success
        UploadFileStatus.ERROR -> colors.error
    }
}

private fun formatByteSize(size: Int): String {
    if (size <= 0) return "0 B"
    val units = listOf("B", "KB", "MB", "GB")
    var value = size.toDouble()
    var unitIndex = 0
    while (value >= 1024.0 && unitIndex < units.lastIndex) {
        value /= 1024.0
        unitIndex += 1
    }
    return if (unitIndex == 0) {
        "${value.toInt()} ${units[unitIndex]}"
    } else {
        "${(value * 100).toInt() / 100.0} ${units[unitIndex]}"
    }
}
