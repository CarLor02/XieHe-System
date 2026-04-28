package com.xiehe.spine.ui.components.form.picker

import com.xiehe.spine.ui.components.text.shared.Text
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.xiehe.spine.ui.motion.AppBottomSheetHost
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun PickerDialog(
    title: String,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    showActionRow: Boolean = true,
    onConfirm: (() -> Unit)? = null,
    maxDialogWidth: Dp? = null,
    maxDialogHeightFraction: Float? = null,
    overlayMaxAlpha: Float = 0.26f,
    edgeToEdge: Boolean = false,
    roundBottomCorners: Boolean = false,
    content: @Composable ColumnScope.(dismiss: () -> Unit) -> Unit,
) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        visible = true
    }

    val dismiss = {
        visible = false
    }

    val containerShape = if (roundBottomCorners) {
        RoundedCornerShape(SpineTheme.radius.xl)
    } else {
        RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    }
    val sizeModifier = Modifier.run {
        var result: Modifier = this
        if (maxDialogWidth != null) {
            result = result.widthIn(max = maxDialogWidth)
        }
        if (maxDialogHeightFraction != null) {
            result = result.fillMaxHeight(maxDialogHeightFraction.coerceIn(0.2f, 0.95f))
        }
        result
    }

    Dialog(
        onDismissRequest = dismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
    ) {
        AppBottomSheetHost(
            visible = visible,
            onDismissRequest = dismiss,
            onDismissed = onDismissRequest,
            scrimAlpha = overlayMaxAlpha.coerceIn(0f, 1f),
        ) {
            Column(
                modifier = modifier
                    .fillMaxWidth()
                    .then(sizeModifier)
                    .then(
                        if (edgeToEdge) {
                            Modifier
                        } else {
                            Modifier.padding(horizontal = 10.dp, vertical = 8.dp)
                        },
                    )
                    .background(SpineTheme.colors.surface, containerShape)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .width(42.dp)
                        .height(4.dp)
                        .background(
                            color = SpineTheme.colors.borderStrong,
                            shape = RoundedCornerShape(SpineTheme.radius.full),
                        )
                )

                if (title.isNotBlank()) {
                    Text(
                        text = title,
                        style = SpineTheme.typography.title.copy(fontWeight = FontWeight.SemiBold),
                        modifier = Modifier.fillMaxWidth(),
                        color = SpineTheme.colors.textPrimary,
                    )
                }

                content(dismiss)

                if (showActionRow) {
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                            Text(
                                text = "取消",
                                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                color = SpineTheme.colors.textSecondary,
                                modifier = Modifier.clickable(onClick = dismiss),
                            )
                        }
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(28.dp)
                                .background(SpineTheme.colors.borderSubtle),
                        )
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                            Text(
                                text = "确定",
                                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                                color = SpineTheme.colors.primary,
                                modifier = Modifier.clickable {
                                    onConfirm?.invoke()
                                    dismiss()
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}
