package com.xiehe.spine.ui.components.card.image

import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.image.ImageWorkflowStatus
import com.xiehe.spine.data.image.normalizeImageStatus
import com.xiehe.spine.data.image.resolveImageCategory
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.motion.AppMotion
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.theme.resolve
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.decodeToImageBitmap
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke

data class ImageTaskAction(
    val text: String,
    val glyph: IconToken,
    val style: ImageTaskActionStyle,
    val onClick: () -> Unit,
)

enum class ImageTaskActionStyle {
    PRIMARY,
    OUTLINE,
    DANGER,
}

private sealed interface ThumbnailState {
    data object Loading : ThumbnailState
    data class Success(val bitmap: ImageBitmap) : ThumbnailState
    data object Error : ThumbnailState
}

@Composable
fun ImageTaskCard(
    item: ImageFileSummary,
    session: UserSession,
    repository: ImageFileRepository,
    onSessionUpdated: (UserSession) -> Unit,
    actions: List<ImageTaskAction>,
    modifier: Modifier = Modifier,
    compactActionText: Boolean = false,
    singleActionBottomRight: Boolean = false,
    patientNameOverride: String? = null,
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val examType = compactCardExamType(item)
            val status = imageStatusPresentation(item.status)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                ImageThumbnail(
                    fileId = item.id,
                    session = session,
                    repository = repository,
                    onSessionUpdated = onSessionUpdated,
                    modifier = Modifier
                        .size(width = 88.dp, height = 88.dp)
                        .clip(RoundedCornerShape(SpineTheme.radius.md))
                        .background(SpineTheme.colors.surfaceMuted),
                )

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(7.dp),
                ) {
                    Text(
                        text = item.originalFilename.ifBlank { "未命名影像" },
                        style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Bold),
                        color = SpineTheme.colors.textPrimary,
                        maxLines = 1,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        StatusChip(
                            text = examType,
                            textColor = Color.White,
                            background = examTypeBrush(item),
                        )
                        StatusChip(
                            text = status.text,
                            textColor = status.textColor,
                            background = status.background,
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppIcon(
                            glyph = IconToken.CLOCK,
                            tint = SpineTheme.colors.textTertiary,
                            modifier = Modifier.size(13.dp),
                        )
                        Text(
                            text = imageTimeLabel(item),
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.textTertiary,
                            maxLines = 1,
                        )
                    }
                }
            }

            if (actions.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (singleActionBottomRight && actions.size == 1) {
                        val action = actions.first()
                        Spacer(modifier = Modifier.weight(1f))
                        ImageActionButton(
                            text = action.text,
                            glyph = action.glyph,
                            style = action.style,
                            compactText = compactActionText,
                            modifier = Modifier.width(118.dp),
                            onClick = action.onClick,
                        )
                    } else if (actions.size == 3 && actions.firstOrNull()?.style == ImageTaskActionStyle.PRIMARY) {
                        val primaryAction = actions[0]
                        val secondaryActions = actions.drop(1)
                        ImageActionButton(
                            text = primaryAction.text,
                            glyph = primaryAction.glyph,
                            style = primaryAction.style,
                            compactText = compactActionText,
                            modifier = Modifier.weight(1f),
                            onClick = primaryAction.onClick,
                        )
                        secondaryActions.forEach { action ->
                            ImageActionButton(
                                text = action.text,
                                glyph = action.glyph,
                                style = action.style,
                                compactText = compactActionText,
                                modifier = Modifier.width(44.dp),
                                onClick = action.onClick,
                            )
                        }
                    } else {
                        actions.forEach { action ->
                            ImageActionButton(
                                text = action.text,
                                glyph = action.glyph,
                                style = action.style,
                                compactText = compactActionText,
                                modifier = Modifier.weight(1f),
                                onClick = action.onClick,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(
    text: String,
    textColor: Color,
    background: Any,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .then(
                when (background) {
                    is Brush -> Modifier.background(background)
                    is Color -> Modifier.background(background)
                    else -> Modifier
                },
            )
            .padding(horizontal = 9.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = textColor,
        )
    }
}

@Composable
private fun ImageThumbnail(
    fileId: Int,
    session: UserSession,
    repository: ImageFileRepository,
    onSessionUpdated: (UserSession) -> Unit,
    modifier: Modifier = Modifier,
) {
    var state by remember(fileId) { mutableStateOf<ThumbnailState>(ThumbnailState.Loading) }
    var retryNonce by remember(fileId) { mutableIntStateOf(0) }

    LaunchedEffect(fileId, session.accessToken, retryNonce) {
        state = ThumbnailState.Loading
        when (val result = repository.downloadImageBytes(session, fileId)) {
            is AppResult.Success -> {
                onSessionUpdated(result.data.first)
                val bitmap = withContext(Dispatchers.Default) {
                    runCatching { result.data.second.decodeToImageBitmap() }.getOrNull()
                }
                if (bitmap == null && retryNonce == 0) {
                    repository.evictImageCache(session.userId, fileId)
                    retryNonce += 1
                    return@LaunchedEffect
                }
                state = if (bitmap != null) ThumbnailState.Success(bitmap) else ThumbnailState.Error
            }

            is AppResult.Failure -> {
                state = ThumbnailState.Error
            }
        }
    }

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        when (val current = state) {
            ThumbnailState.Loading -> {
                ThumbnailLoadingIndicator()
            }

            is ThumbnailState.Success -> {
                Image(
                    bitmap = current.bitmap,
                    contentDescription = "image_preview_$fileId",
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop,
                )
            }

            ThumbnailState.Error -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    AppIcon(glyph = IconToken.IMAGE, tint = SpineTheme.colors.textTertiary, modifier = Modifier.size(18.dp))
                    Text(
                        text = "加载失败",
                        style = SpineTheme.typography.caption,
                        color = SpineTheme.colors.textTertiary,
                    )
                }
            }
        }
    }
}

@Composable
private fun ThumbnailLoadingIndicator(
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val transition = rememberInfiniteTransition(label = "thumbnail_loading_transition")
    val startAngle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = AppMotion.loadingSpinSpec(),
        label = "thumbnail_loading_angle",
    )

    Canvas(
        modifier = modifier.size(26.dp),
    ) {
        val strokeWidth = 3.dp.toPx()
        drawArc(
            color = colors.borderSubtle,
            startAngle = 0f,
            sweepAngle = 360f,
            useCenter = false,
            style = Stroke(width = strokeWidth),
        )
        drawArc(
            color = colors.primary,
            startAngle = startAngle,
            sweepAngle = 112f,
            useCenter = false,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
        )
    }
}

@Composable
private fun ImageActionButton(
    text: String,
    glyph: IconToken,
    style: ImageTaskActionStyle,
    compactText: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    val corner = RoundedCornerShape(SpineTheme.radius.md)
    val iconOnly = style != ImageTaskActionStyle.PRIMARY
    val contentColor = when (style) {
        ImageTaskActionStyle.PRIMARY -> colors.onPrimary
        ImageTaskActionStyle.OUTLINE -> colors.textSecondary
        ImageTaskActionStyle.DANGER -> colors.error
    }
    val background = when (style) {
        ImageTaskActionStyle.PRIMARY -> colors.primary
        ImageTaskActionStyle.OUTLINE -> colors.surfaceMuted
        ImageTaskActionStyle.DANGER -> colors.error.copy(alpha = if (colors.isDark) 0.16f else 0.1f)
    }
    val border = when (style) {
        ImageTaskActionStyle.PRIMARY -> Color.Transparent
        ImageTaskActionStyle.OUTLINE -> Color.Transparent
        ImageTaskActionStyle.DANGER -> Color.Transparent
    }

    Row(
        modifier = modifier
            .height(44.dp)
            .clip(corner)
            .background(
                if (style == ImageTaskActionStyle.PRIMARY) {
                    Brush.horizontalGradient(listOf(colors.primary, colors.primary.copy(alpha = 0.86f)))
                } else {
                    Brush.horizontalGradient(listOf(background, background))
                },
            )
            .border(width = 1.dp, color = border, shape = corner)
            .clickable(onClick = onClick)
            .padding(horizontal = if (iconOnly) 0.dp else 12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(
            glyph = glyph,
            tint = contentColor,
            modifier = Modifier.size(if (iconOnly) 16.dp else 15.dp),
        )
        if (!iconOnly) {
            Text(
                text = text,
                style = if (compactText) {
                    SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold)
                } else {
                    SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold)
                },
                color = contentColor,
                modifier = Modifier.padding(start = 6.dp),
                maxLines = 1,
            )
        }
    }
}

data class ImageStatusPresentation(
    val text: String,
    val textColor: Color,
    val background: Color,
)

@Composable
fun imageStatusPresentation(rawStatus: String?): ImageStatusPresentation {
    val colors = SpineTheme.colors
    return when (normalizeImageStatus(rawStatus)) {
        ImageWorkflowStatus.UPLOADED -> ImageStatusPresentation(
            text = "待审核",
            textColor = colors.primary,
            background = colors.primaryMuted,
        )

        ImageWorkflowStatus.PROCESSED -> ImageStatusPresentation(
            text = "已归档",
            textColor = colors.textSecondary,
            background = colors.surfaceMuted,
        )

        ImageWorkflowStatus.PROCESSING -> ImageStatusPresentation(
            text = "处理中",
            textColor = colors.warning,
            background = colors.warning.copy(alpha = 0.16f),
        )

        ImageWorkflowStatus.FAILED -> ImageStatusPresentation(
            text = "失败",
            textColor = colors.error,
            background = colors.error.copy(alpha = 0.16f),
        )

        else -> ImageStatusPresentation(
            text = rawStatus ?: "未知",
            textColor = colors.textSecondary,
            background = colors.surfaceMuted,
        )
    }
}

fun inferExamType(item: ImageFileSummary): String {
    return item.description?.trim().takeIf { !it.isNullOrBlank() } ?: resolveImageCategory(item).label
}

fun imageSubtitle(
    item: ImageFileSummary,
    patientNameOverride: String? = null,
): String {
    val patient = patientNameOverride?.takeIf { it.isNotBlank() }
        ?: item.patientName?.takeIf { it.isNotBlank() }
        ?: item.patientId?.let { "患者#$it" }
        ?: "未关联患者"
    val exam = inferExamType(item)
    return "$patient · $exam"
}

fun imageTimeLabel(item: ImageFileSummary): String {
    val source = item.uploadedAt ?: item.createdAt ?: item.studyDate
    if (source.isNullOrBlank()) {
        return "时间未知"
    }
    return source.replace("T", " ").take(16).replace("-", "/")
}

private fun compactCardExamType(item: ImageFileSummary): String {
    return inferExamType(item)
}

@Composable
private fun examTypeBrush(item: ImageFileSummary): Brush {
    val style = SpineTheme.colors.examCategories.resolve(compactCardExamType(item))
    return Brush.horizontalGradient(listOf(style.accentStart, style.accentEnd))
}
