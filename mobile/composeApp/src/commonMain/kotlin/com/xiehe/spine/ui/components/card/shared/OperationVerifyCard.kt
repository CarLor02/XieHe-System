package com.xiehe.spine.ui.components.card.shared

import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.text.shared.Text
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun OperationVerifyCard(
    message: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "操作确认",
    confirmText: String = "确认",
    cancelText: String = "取消",
    confirmButtonColor: Color = SpineTheme.colors.error,
    cancelButtonColor: Color = SpineTheme.colors.textSecondary,
    confirmTextColor: Color = SpineTheme.colors.onPrimary,
    cancelTextColor: Color = SpineTheme.colors.onPrimary,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .widthIn(max = 340.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = title,
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.SemiBold),
                color = SpineTheme.colors.textPrimary,
            )
            Text(
                text = message,
                style = SpineTheme.typography.body,
                color = SpineTheme.colors.textSecondary,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    text = cancelText,
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                    customContainerColor = cancelButtonColor,
                    customContentColor = cancelTextColor,
                )
                Button(
                    text = confirmText,
                    onClick = onConfirm,
                    modifier = Modifier.weight(1f),
                    customContainerColor = confirmButtonColor,
                    customContentColor = confirmTextColor,
                )
            }
        }
    }
}
