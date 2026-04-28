package com.xiehe.spine.ui.screens.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.navigation.shared.NavBar
import com.xiehe.spine.ui.components.navigation.shared.NavItem
import com.xiehe.spine.ui.theme.SpineTheme

private val defaultNavItems = listOf(
    NavItem(label = "工作台", glyph = IconToken.LAYOUT_DASHBOARD),
    NavItem(label = "患者中心", glyph = IconToken.HEART_PULSE),
    NavItem(label = "影像中心", glyph = IconToken.IMAGE),
    NavItem(label = "个人中心", glyph = IconToken.USER_ROUND),
)

@Composable
fun MobileShell(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    showBottomBar: Boolean = true,
    headerContent: @Composable () -> Unit,
    content: @Composable () -> Unit,
) {
    val navItems = remember { defaultNavItems }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.backgroundElevated),
    ) {
        headerContent()
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) {
            content()
        }
        if (showBottomBar) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .navigationBarsPadding(),
            ) {
                NavBar(
                    items = navItems,
                    selectedIndex = selectedTab,
                    onSelect = onTabSelected,
                )
            }
        }
    }
}
