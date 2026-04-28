package com.xiehe.spine.ui.components.navigation.shared

import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.motion.AppMotion
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun BottomTabBar(
    tabs: List<String>,
    icons: List<IconToken>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val containerShape = RoundedCornerShape(30.dp)
    val tabSpacing = 6.dp
    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .clip(containerShape)
            .background(colors.surface.copy(alpha = if (colors.isDark) 0.96f else 0.95f))
            .border(1.dp, colors.borderSubtle, containerShape)
            .padding(horizontal = 4.dp, vertical = 4.dp),
    ) {
        val tabCount = tabs.size.coerceAtLeast(1)
        val indicatorWidth = (maxWidth - (tabSpacing * (tabCount - 1))) / tabCount
        val indicatorOffset by animateDpAsState(
            targetValue = (indicatorWidth + tabSpacing) * selectedIndex.coerceIn(0, tabCount - 1),
            animationSpec = AppMotion.tabIndicatorSpec(),
            label = "bottom_tab_indicator_offset",
        )

        Box(
            modifier = Modifier
                .offset(x = indicatorOffset)
                .width(indicatorWidth)
                .height(56.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.linearGradient(
                        listOf(
                            colors.primary.copy(alpha = if (colors.isDark) 0.92f else 0.86f),
                            colors.primary,
                        ),
                    ),
                ),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(tabSpacing),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tabs.forEachIndexed { index, label ->
                val selected = selectedIndex == index
                val labelColor by animateColorAsState(
                    targetValue = if (selected) colors.onPrimary else colors.tabInactive,
                    animationSpec = AppMotion.tabLabelColorSpec(),
                    label = "bottom_tab_label_color",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(26.dp))
                        .clickable { onSelect(index) }
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    AppIcon(
                        glyph = icons.getOrElse(index) { IconToken.LAYOUT_DASHBOARD },
                        modifier = Modifier.height(18.dp),
                        tint = if (selected) colors.onPrimary else colors.tabInactive,
                    )
                    BasicText(
                        text = label,
                        style = SpineTheme.typography.caption.copy(
                            color = labelColor,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        ),
                    )
                }
            }
        }
    }
}
