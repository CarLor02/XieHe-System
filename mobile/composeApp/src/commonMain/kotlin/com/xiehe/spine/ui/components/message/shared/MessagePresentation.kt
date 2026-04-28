package com.xiehe.spine.ui.components.message.shared

import androidx.compose.ui.graphics.Color
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineAppColors

data class MessageTypeStyle(
    val icon: IconToken,
    val iconTint: Color,
    val background: Color,
)

fun messageTypeStyle(
    messageType: String?,
    colors: SpineAppColors,
): MessageTypeStyle {
    val type = messageType.orEmpty()
    return when {
        type.contains("系统") -> MessageTypeStyle(
            icon = IconToken.BELL,
            iconTint = colors.primary,
            background = colors.primaryMuted,
        )

        type.contains("审核") -> MessageTypeStyle(
            icon = IconToken.CHECK,
            iconTint = colors.warning,
            background = colors.warning.copy(alpha = 0.16f),
        )

        else -> MessageTypeStyle(
            icon = IconToken.MESSAGE,
            iconTint = colors.textSecondary,
            background = colors.surfaceMuted,
        )
    }
}

fun messageTimeLabel(source: String?): String {
    val raw = source ?: return ""
    return raw.replace("T", " ").take(16)
}
