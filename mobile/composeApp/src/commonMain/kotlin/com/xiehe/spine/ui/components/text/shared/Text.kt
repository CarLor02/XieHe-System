package com.xiehe.spine.ui.components.text.shared

import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun Text(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = SpineTheme.typography.body,
    color: Color? = null,
    maxLines: Int = Int.MAX_VALUE,
) {
    BasicText(
        text = text,
        modifier = modifier,
        style = style.copy(color = color ?: if (style.color == Color.Unspecified) SpineTheme.colors.textPrimary else style.color),
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
    )
}
