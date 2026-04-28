package com.xiehe.spine.ui.components.form.input

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun SelectablePill(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(SpineTheme.radius.full))
            .background(if (selected) colors.primaryMuted else colors.surface)
            .border(1.dp, if (selected) colors.primary else colors.borderSubtle, RoundedCornerShape(SpineTheme.radius.full))
            .clickable(onClick = onClick)
            .padding(horizontal = SpineTheme.spacing.base, vertical = SpineTheme.spacing.sm),
    ) {
        BasicText(
            text = text,
            style = SpineTheme.typography.subhead.copy(
                color = if (selected) colors.primary else colors.textSecondary,
            ),
        )
    }
}
