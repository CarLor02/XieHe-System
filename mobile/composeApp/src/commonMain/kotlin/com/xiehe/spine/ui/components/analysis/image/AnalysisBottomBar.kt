package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

enum class AnalysisBottomAction {
    MOVE,
    LOCK,
    UNDO,
    REDO,
    CLEAR,
}

@Composable
fun AnalysisBottomBar(
    modifier: Modifier = Modifier,
    moveSelected: Boolean = false,
    lockSelected: Boolean = false,
    canUndo: Boolean = true,
    canRedo: Boolean = true,
    canClear: Boolean = true,
    onAction: (AnalysisBottomAction) -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .background(colors.surface.copy(alpha = 0.96f))
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AnalysisBottomItem(
            label = "移动",
            icon = IconToken.MEASURE_MOVE,
            selected = moveSelected,
            enabled = true,
            onClick = { onAction(AnalysisBottomAction.MOVE) },
        )
        AnalysisBottomItem(
            label = "锁定",
            icon = IconToken.LOCK,
            selected = lockSelected,
            enabled = true,
            onClick = { onAction(AnalysisBottomAction.LOCK) },
        )
        AnalysisBottomItem(
            label = "撤销",
            icon = IconToken.MEASURE_UNDO,
            selected = false,
            enabled = canUndo,
            onClick = { onAction(AnalysisBottomAction.UNDO) },
        )
        AnalysisBottomItem(
            label = "重做",
            icon = IconToken.MEASURE_REDO,
            selected = false,
            enabled = canRedo,
            onClick = { onAction(AnalysisBottomAction.REDO) },
        )
        AnalysisBottomItem(
            label = "清除",
            icon = IconToken.DELETE,
            selected = false,
            enabled = canClear,
            destructive = true,
            onClick = { onAction(AnalysisBottomAction.CLEAR) },
        )
    }
}

@Composable
private fun AnalysisBottomItem(
    label: String,
    icon: IconToken,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    destructive: Boolean = false,
) {
    val colors = SpineTheme.colors
    val contentColor = when {
        !enabled -> colors.textTertiary
        destructive -> colors.destructive
        selected -> colors.onPrimary
        else -> colors.textSecondary
    }
    val containerColor = when {
        !enabled -> colors.surfaceMuted
        selected -> colors.primary
        else -> colors.surfaceMuted.copy(alpha = 0.7f)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(containerColor)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 9.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            AppIcon(
                glyph = icon,
                tint = contentColor,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = label,
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = contentColor,
            )
        }
    }
}
