package com.xiehe.spine.ui.components.card.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.notification.NotificationMessage
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.message.shared.messageTimeLabel
import com.xiehe.spine.ui.components.message.shared.messageTypeStyle
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun ActivityCard(items: List<NotificationMessage>) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(width = 4.dp, height = 18.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(colors.info.copy(alpha = 0.9f), colors.info),
                        ),
                    ),
            )
            Text(
                text = "近期动态",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
        }

        if (items.isEmpty()) {
            Text(
                text = "暂无动态",
                style = SpineTheme.typography.subhead,
                color = colors.textSecondary,
            )
        } else {
            items.forEachIndexed { index, activity ->
                ActivityRow(activity = activity)
                if (index != items.lastIndex) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(colors.borderSubtle.copy(alpha = if (colors.isDark) 1f else 0.55f)),
                    )
                }
            }
        }
    }
}

@Composable
private fun ActivityRow(activity: NotificationMessage) {
    val colors = SpineTheme.colors
    val style = messageTypeStyle(activity.messageType, colors)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(style.background),
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(glyph = style.icon, tint = style.iconTint, modifier = Modifier.size(16.dp))
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = activity.title,
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
                color = colors.textPrimary,
            )
            Text(
                text = activity.content,
                style = SpineTheme.typography.caption,
                color = colors.textSecondary,
                maxLines = 1,
            )
        }
        Text(
            text = messageTimeLabel(activity.createdAt),
            style = SpineTheme.typography.caption,
            color = colors.textTertiary,
        )
    }
}
