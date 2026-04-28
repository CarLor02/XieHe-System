package com.xiehe.spine.ui.components.card.shared

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun Card(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(SpineTheme.radius.xl)
    Column(
        modifier = modifier
            .animateContentSize(tween(220))
            .shadow(
                elevation = 14.dp,
                shape = shape,
                clip = false,
                ambientColor = SpineTheme.colors.textTertiary.copy(alpha = 0.2f),
                spotColor = SpineTheme.colors.textTertiary.copy(alpha = 0.2f),
            )
            .clip(shape)
            .background(SpineTheme.colors.surface)
            .border(1.dp, SpineTheme.colors.borderSubtle, shape)
            .padding(SpineTheme.spacing.xl),
        verticalArrangement = Arrangement.spacedBy(SpineTheme.spacing.md),
        content = { content() },
    )
}
