package com.xiehe.spine.ui.components.card.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.badge.shared.IconBadge
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun QuickActionTile(
    label: String,
    icon: IconToken,
    colors: List<Color>,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IconBadge(
            glyph = icon,
            colors = colors,
            size = 56.dp,
        )
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = SpineTheme.colors.textSecondary,
        )
    }
}






