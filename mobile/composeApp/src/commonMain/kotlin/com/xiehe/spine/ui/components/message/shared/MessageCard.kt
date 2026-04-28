package com.xiehe.spine.ui.components.message.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.notification.NotificationMessage
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun MessageCard(item: NotificationMessage) {
    val colors = SpineTheme.colors
    val style = messageTypeStyle(item.messageType, colors)

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(style.background, RoundedCornerShape(SpineTheme.radius.md)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(glyph = style.icon, tint = style.iconTint, modifier = Modifier.size(16.dp))
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(
                        text = item.title,
                        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                    )
                    Text(
                        text = messageTimeLabel(item.createdAt),
                        style = SpineTheme.typography.caption,
                        color = colors.textTertiary,
                    )
                }
                item.messageType?.takeIf { it.isNotBlank() }?.let { type ->
                    Text(
                        text = type,
                        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                        color = style.iconTint,
                        modifier = Modifier
                            .background(style.background, RoundedCornerShape(SpineTheme.radius.full))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                }
                Text(text = item.content, style = SpineTheme.typography.subhead, color = colors.textSecondary)
            }
        }
    }
}
