package com.xiehe.spine.ui.components.button.shared

import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.motion.rememberPressScale
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun Button(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingGlyph: IconToken? = null,
    customContainerColor: androidx.compose.ui.graphics.Color? = null,
    customContentColor: androidx.compose.ui.graphics.Color? = null,
) {
    val colors = SpineTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val scale = rememberPressScale(
        interactionSource = interaction,
        enabled = enabled,
        label = "button_scale",
    )
    val shape = RoundedCornerShape(SpineTheme.radius.md)
    val containerColor = customContainerColor ?: colors.primary
    val gradientBrush = Brush.horizontalGradient(
        colors = listOf(
            containerColor,
            containerColor.copy(alpha = 0.86f),
        ),
    )
    Box(
        modifier = modifier
            .height(48.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(
                elevation = if (enabled) 10.dp else 0.dp,
                shape = shape,
                ambientColor = colors.primary.copy(alpha = 0.28f),
                spotColor = colors.primary.copy(alpha = 0.28f),
                clip = false,
            )
            .clip(shape)
            .background(if (enabled) gradientBrush else Brush.horizontalGradient(listOf(colors.surfaceMuted, colors.surfaceMuted)))
            .clickable(enabled = enabled, interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (leadingGlyph != null) {
                AppIcon(
                    glyph = leadingGlyph,
                    modifier = Modifier.size(16.dp),
                    tint = if (enabled) (customContentColor ?: colors.onPrimary) else colors.textTertiary,
                )
            }
            BasicText(
                text = text,
                style = SpineTheme.typography.body.copy(
                    color = if (enabled) (customContentColor ?: colors.onPrimary) else colors.textTertiary,
                    fontWeight = FontWeight.SemiBold,
                ),
            )
        }
    }
}
