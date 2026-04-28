package com.xiehe.spine.ui.components.avatar.shared

import com.xiehe.spine.ui.components.text.shared.Text
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.painter.Painter
import com.xiehe.spine.ui.theme.SpineTheme
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource

@Composable
fun Avatar(
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
    avatarPainter: Painter? = null,
    avatarResource: DrawableResource? = null,
) {
    val resolvedPainter = avatarPainter ?: avatarResource?.let { painterResource(it) }

    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(SpineTheme.radius.lg))
            .background(SpineTheme.colors.primaryMuted),
        contentAlignment = Alignment.Center,
    ) {
        if (resolvedPainter != null) {
            Image(
                painter = resolvedPainter,
                contentDescription = "avatar_${name.ifBlank { "unknown" }}",
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Text(
                text = avatarInitials(name),
                style = SpineTheme.typography.subhead.copy(
                    color = SpineTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold,
                ),
            )
        }
    }
}

private fun avatarInitials(name: String): String {
    val trimmed = name.trim()
    if (trimmed.isBlank()) {
        return "?"
    }

    val tokens = trimmed.split(' ').filter { it.isNotBlank() }
    if (tokens.size >= 2) {
        val left = tokens.first().firstOrNull()?.uppercaseChar() ?: return "?"
        val right = tokens.last().firstOrNull()?.uppercaseChar() ?: return left.toString()
        return "$left$right"
    }

    val compact = trimmed.filterNot { it.isWhitespace() }
    return when {
        compact.length >= 2 -> compact.takeLast(2)
        compact.isNotEmpty() -> compact
        else -> "?"
    }
}
