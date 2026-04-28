package com.xiehe.spine.ui.components.badge.shared

import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun IconBadge(
    glyph: IconToken,
    modifier: Modifier = Modifier,
    size: Dp = 56.dp,
    iconSize: Dp = 20.dp,
    cornerRadius: Dp = 20.dp,
    colors: List<Color> = listOf(SpineTheme.colors.primary, SpineTheme.colors.primary.copy(alpha = 0.86f)),
    iconTint: Color = SpineTheme.colors.onPrimary,
    shadowColor: Color = colors.firstOrNull()?.copy(alpha = 0.24f) ?: SpineTheme.colors.primary.copy(alpha = 0.24f),
) {
    val shape = RoundedCornerShape(cornerRadius)
    Box(
        modifier = modifier
            .size(size)
            .shadow(
                elevation = 12.dp,
                shape = shape,
                ambientColor = shadowColor,
                spotColor = shadowColor,
                clip = false,
            )
            .clip(shape)
            .background(Brush.linearGradient(colors)),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(glyph = glyph, tint = iconTint, modifier = Modifier.size(iconSize))
    }
}