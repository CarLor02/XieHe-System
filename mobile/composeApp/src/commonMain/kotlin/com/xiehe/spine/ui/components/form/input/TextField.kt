package com.xiehe.spine.ui.components.form.input

import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun TextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    password: Boolean = false,
    singleLine: Boolean = true,
    readOnly: Boolean = false,
    leadingGlyph: IconToken? = null,
    trailingGlyph: IconToken? = null,
    trailingText: String? = null,
    onTrailingClick: (() -> Unit)? = null,
) {
    val colors = SpineTheme.colors
    val interactionSource = remember { MutableInteractionSource() }
    val visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None
    val shape = RoundedCornerShape(SpineTheme.radius.lg)
    val fieldBackground = colors.surfaceMuted.copy(alpha = 0.62f)

    Row(
        modifier = modifier
            .clip(shape)
            .background(fieldBackground)
            .border(1.dp, colors.borderSubtle, shape)
            .padding(horizontal = SpineTheme.spacing.base, vertical = SpineTheme.spacing.base),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (leadingGlyph != null) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(SpineTheme.radius.sm))
                    .background(fieldBackground),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = leadingGlyph,
                    modifier = Modifier.size(13.dp),
                    tint = colors.textSecondary,
                )
            }
        }
        Box(modifier = Modifier.weight(1f)) {
            if (value.isBlank()) {
                BasicText(
                    text = placeholder,
                    style = SpineTheme.typography.body.copy(color = colors.textTertiary),
                )
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.fillMaxWidth(),
                textStyle = SpineTheme.typography.body.copy(color = colors.textPrimary),
                cursorBrush = SolidColor(colors.primary),
                interactionSource = interactionSource,
                singleLine = singleLine,
                visualTransformation = visualTransformation,
                readOnly = readOnly,
            )
        }
        if (trailingText != null) {
            FieldActionChip(
                text = trailingText,
                onClick = onTrailingClick,
            )
        } else if (trailingGlyph != null) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(SpineTheme.radius.sm))
                    .background(fieldBackground)
                    .then(
                        if (onTrailingClick != null) {
                            Modifier.clickable(onClick = onTrailingClick)
                        } else {
                            Modifier
                        },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = trailingGlyph,
                    modifier = Modifier.size(13.dp),
                    tint = colors.textSecondary,
                )
            }
        }
    }
}
