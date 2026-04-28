package com.xiehe.spine.ui.components.button.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.motion.rememberPressScale
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun CompactButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = SpineTheme.colors.primary,
    contentColor: Color = SpineTheme.colors.onPrimary,
) {
    val interaction = remember { MutableInteractionSource() }
    val scale = rememberPressScale(
        interactionSource = interaction,
        enabled = enabled,
        label = "compact_button_scale",
    )

    val shape = RoundedCornerShape(SpineTheme.radius.md)
    Box(
        modifier = modifier
            .width(88.dp)
            .height(36.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(
                elevation = if (enabled) 8.dp else 0.dp,
                shape = shape,
                ambientColor = containerColor.copy(alpha = 0.24f),
                spotColor = containerColor.copy(alpha = 0.24f),
                clip = false,
            )
            .clip(shape)
            .background(
                if (enabled) {
                    Brush.horizontalGradient(listOf(containerColor, containerColor.copy(alpha = 0.86f)))
                } else {
                    Brush.horizontalGradient(listOf(SpineTheme.colors.surfaceMuted, SpineTheme.colors.surfaceMuted))
                },
            )
            .clickable(enabled = enabled, interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            style = SpineTheme.typography.subhead.copy(
                color = if (enabled) contentColor else SpineTheme.colors.textTertiary,
                fontWeight = FontWeight.SemiBold,
            ),
        )
    }
}
