package com.xiehe.spine.ui.components.card.message

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.notification.NotificationMessage
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.message.shared.messageTimeLabel
import com.xiehe.spine.ui.theme.SpineAppColors
import com.xiehe.spine.ui.theme.SpineTheme

private data class MessageNoticeStyle(
    val type: NotificationType,
    val icon: IconToken,
    val gradient: List<Color>,
    val chipText: String,
    val chipTextColor: Color,
    val chipBackgroundColor: Color,
)

private sealed interface NotificationType {
    data object Info : NotificationType
    data object Warning : NotificationType
    data object Error : NotificationType
    data object Success : NotificationType
    data object Unknown : NotificationType
}

@Composable
fun MessageNoticeCard(
    item: NotificationMessage,
    onMarkRead: (NotificationMessage) -> Unit,
    onDelete: (NotificationMessage) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(24.dp)
    val shadowColor = colors.textPrimary.copy(alpha = if (colors.isDark) 0.22f else 0.08f)
    val style = messageNoticeStyle(item, colors)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(18.dp, shape, ambientColor = shadowColor, spotColor = shadowColor)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.linearGradient(style.gradient)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = style.icon,
                    tint = colors.onPrimary,
                    modifier = Modifier.size(18.dp),
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(style.chipBackgroundColor)
                            .padding(horizontal = 10.dp, vertical = 3.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = style.chipText,
                            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                            color = style.chipTextColor,
                        )
                    }
                    Text(
                        text = item.senderName+"于 "+messageTimeLabel(item.createdAt)+" 发送",
                        style = SpineTheme.typography.caption,
                        color = colors.textTertiary,
                    )
                }
                Text(
                    text = item.title,
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = if (item.isRead) colors.textSecondary else colors.textPrimary,
                )
                Text(
                    text = item.content,
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Normal),
                    color = colors.textSecondary,
                    maxLines = 3,
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(colors.borderSubtle),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (item.isRead) {
                Text(
                    text = "已读",
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textTertiary,
                )
            } else {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onMarkRead(item) }
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AppIcon(
                        glyph = IconToken.CHECK,
                        tint = colors.primary,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = "标记已读",
                        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.primary,
                    )
                }
            }

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onDelete(item) }
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(
                    glyph = IconToken.DELETE,
                    tint = colors.error,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = "删除",
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.error,
                )
            }
        }
    }
}

private fun messageNoticeStyle(
    item: NotificationMessage,
    colors: SpineAppColors,
): MessageNoticeStyle {
    return when (notificationTypeOf(item.messageType)) {
        NotificationType.Info -> MessageNoticeStyle(
            type = NotificationType.Info,
            icon = IconToken.BELL,
            gradient = listOf(colors.primary.copy(alpha = 0.78f), colors.info),
            chipText = "通知",
            chipTextColor = colors.info,
            chipBackgroundColor = colors.info.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
        )
        NotificationType.Warning -> MessageNoticeStyle(
            type = NotificationType.Warning,
            icon = IconToken.BELL_RING,
            gradient = listOf(colors.primary.copy(alpha = 0.78f), colors.warning),
            chipText = "警告",
            chipTextColor = colors.warning,
            chipBackgroundColor = colors.warning.copy(alpha = if (colors.isDark) 0.22f else 0.14f),
        )
        NotificationType.Error -> MessageNoticeStyle(
            type = NotificationType.Error,
            icon = IconToken.LOCK,
            gradient = listOf(colors.primary.copy(alpha = 0.78f), colors.error),
            chipText = "错误",
            chipTextColor = colors.error,
            chipBackgroundColor = colors.error.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
        )
        NotificationType.Success -> MessageNoticeStyle(
            type = NotificationType.Success,
            icon = IconToken.CHECK,
            gradient = listOf(colors.primary.copy(alpha = 0.78f), colors.success),
            chipText = "成功",
            chipTextColor = colors.success,
            chipBackgroundColor = colors.success.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
        )
        NotificationType.Unknown -> MessageNoticeStyle(
            type = NotificationType.Unknown,
            icon = IconToken.BELL,
            gradient = listOf(colors.primary.copy(alpha = 0.78f), colors.info),
            chipText = "通知",
            chipTextColor = colors.info,
            chipBackgroundColor = colors.info.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
        )
    }
}

private fun notificationTypeOf(rawType: String?): NotificationType {
    return when (rawType?.trim()?.lowercase()) {
        "info" -> NotificationType.Info
        "warning" -> NotificationType.Warning
        "error" -> NotificationType.Error
        "success" -> NotificationType.Success
        else -> NotificationType.Unknown
    }
}
