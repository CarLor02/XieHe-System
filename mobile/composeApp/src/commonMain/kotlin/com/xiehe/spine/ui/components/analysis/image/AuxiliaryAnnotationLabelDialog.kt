package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.form.picker.PickerDialog
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun AuxiliaryAnnotationLabelDialog(
    initialLabel: String,
    onDismissRequest: () -> Unit,
    onSave: (String) -> Unit,
) {
    var label by remember(initialLabel) { mutableStateOf(initialLabel) }

    PickerDialog(
        title = "编辑图形文字",
        onDismissRequest = onDismissRequest,
        showActionRow = false,
        maxDialogWidth = 352.dp,
        roundBottomCorners = true,
    ) { dismiss ->
        TextField(
            value = label,
            onValueChange = { label = it },
            placeholder = "输入文字标注...",
            modifier = Modifier.fillMaxWidth(),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DialogAction(
                text = "取消",
                background = SpineTheme.colors.surfaceMuted,
                color = SpineTheme.colors.textSecondary,
                modifier = Modifier.weight(1f),
                onClick = dismiss,
            )
            DialogAction(
                text = "保存",
                background = SpineTheme.colors.primary,
                color = SpineTheme.colors.onPrimary,
                modifier = Modifier.weight(1f),
                onClick = {
                    onSave(label)
                    dismiss()
                },
            )
        }
    }
}

@Composable
private fun DialogAction(
    text: String,
    background: Color,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(42.dp)
            .background(background, RoundedCornerShape(SpineTheme.radius.md))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = color,
            maxLines = 1,
        )
    }
}
