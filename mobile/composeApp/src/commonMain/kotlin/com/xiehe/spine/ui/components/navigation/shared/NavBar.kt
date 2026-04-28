package com.xiehe.spine.ui.components.navigation.shared

import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Modifier

@Immutable
data class NavItem(
    val label: String,
    val glyph: IconToken,
)

@Composable
fun NavBar(
    items: List<NavItem>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    BottomTabBar(
        tabs = items.map { it.label },
        icons = items.map { it.glyph },
        selectedIndex = selectedIndex,
        onSelect = onSelect,
        modifier = modifier,
    )
}
