package com.xiehe.spine.ui.components.basic.shared

import com.xiehe.spine.ui.components.text.shared.Text
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable

@Composable
fun RowWithSeparator(
    items: List<String>,
    separator: String = " · "
) {
    Row {
        items.forEachIndexed { index, item ->
            Text(item)
            if (index != items.lastIndex) {
                Text(separator)
            }
        }
    }
}