package com.xiehe.spine.ui.components.navigation.shared

import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun TopBar(
    title: String,
    modifier: Modifier = Modifier,
    leftGlyph: IconToken? = null,
    rightGlyph: IconToken? = null,
    rightText: String? = null,
    onLeftClick: (() -> Unit)? = null,
    onRightClick: (() -> Unit)? = null,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        colors.primary,
                        colors.primary.copy(alpha = 0.9f),
                        colors.primary.copy(alpha = 0.82f),
                    ),
                ),
            )
            .padding(horizontal = SpineTheme.spacing.xl),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TopActionChip(glyph = leftGlyph, onClick = onLeftClick)
        BasicText(
            text = title,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = SpineTheme.spacing.base),
            style = SpineTheme.typography.title.copy(color = colors.onPrimary),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        when {
            !rightText.isNullOrBlank() -> TopTextAction(text = rightText, onClick = onRightClick)
            else -> TopActionChip(glyph = rightGlyph, onClick = onRightClick)
        }
    }
}

@Composable
private fun TopActionChip(
    glyph: IconToken?,
    onClick: (() -> Unit)?,
) {
    val colors = SpineTheme.colors
    val alpha by animateFloatAsState(
        targetValue = if (glyph == null) 0f else 1f,
        animationSpec = tween(180),
        label = "top_chip_alpha",
    )
    Box(
        modifier = Modifier
            .size(38.dp)
            .alpha(alpha)
            .clip(CircleShape)
            .background(colors.onPrimary.copy(alpha = 0.2f))
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                },
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (glyph != null) {
            AppIcon(glyph = glyph, modifier = Modifier.size(18.dp), tint = colors.onPrimary)
        }
    }
}

@Composable
private fun TopTextAction(
    text: String,
    onClick: (() -> Unit)?,
) {
    val colors = SpineTheme.colors
    val enabled = onClick != null
    Box(
        modifier = Modifier
            .height(38.dp)
            .clip(RoundedCornerShape(SpineTheme.radius.full))
            .background(colors.onPrimary.copy(alpha = if (enabled) 0.22f else 0.12f))
            .then(
                if (enabled) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            style = SpineTheme.typography.subhead.copy(color = colors.onPrimary),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
