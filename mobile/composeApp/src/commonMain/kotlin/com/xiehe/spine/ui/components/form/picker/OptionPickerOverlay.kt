package com.xiehe.spine.ui.components.form.picker

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun OptionPickerOverlay(
    title: String,
    options: List<String>,
    selected: String,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors

    PickerDialog(
        title = title,
        onDismissRequest = onDismiss,
        modifier = modifier,
        showActionRow = false,
        edgeToEdge = true,
    ) { dismiss ->
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 344.dp),
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
        ) {
            items(options) { item ->
                val itemShape = RoundedCornerShape(SpineTheme.radius.md)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(itemShape)
                        .background(
                            color = if (item == selected) colors.primary else colors.surfaceMuted,
                            shape = itemShape,
                        )
                        .clickable {
                            onSelect(item)
                            dismiss()
                        }
                        .padding(horizontal = 12.dp, vertical = 11.dp),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    Text(
                        text = item,
                        color = if (item == selected) colors.onPrimary else colors.textPrimary,
                    )
                    if (item == selected) {
                        Text(
                            text = "✓",
                            color = colors.onPrimary,
                        )
                    }
                }
            }
        }
    }
}
