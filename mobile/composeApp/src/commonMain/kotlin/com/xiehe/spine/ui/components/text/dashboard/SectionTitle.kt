package com.xiehe.spine.ui.components.text.dashboard

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun DashboardSectionTitle(title: String) {
    Text(
        text = title,
        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
        color = SpineTheme.colors.textPrimary,
    )
}
