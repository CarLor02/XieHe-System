package com.xiehe.spine.ui.components.navigation.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.xiehe.spine.currentHour24
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme

private val HeaderContentHeight = 110.dp

@Composable
fun DashboardShellHeader(
    userName: String,
    primaryMeta: String,
    secondaryMeta: String,
    onMessages: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(shellHeaderBrush())
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(HeaderContentHeight),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.18f))
                        .border(2.dp, Color.White.copy(alpha = 0.16f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    AppIcon(
                        glyph = IconToken.USER_ROUND,
                        tint = colors.onPrimary,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = dashboardGreetingMessage(),
                        style = SpineTheme.typography.subhead,
                        color = Color.White.copy(alpha = 0.72f),
                    )
                    Text(
                        text = userName,
                        style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                        color = colors.onPrimary,
                    )
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = primaryMeta,
                        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                        color = Color.White.copy(alpha = 0.9f),
                    )
                    Text(
                        text = secondaryMeta,
                        style = SpineTheme.typography.caption,
                        color = Color.White.copy(alpha = 0.72f),
                    )
                }
                HeaderActionBubble(
                    glyph = IconToken.BELL,
                    onClick = onMessages,
                    showBadge = true,
                )
            }
        }
    }
}

private fun dashboardGreetingMessage(): String {
    return when (currentHour24().coerceIn(0, 23)) {
        in 0..5 -> "已是凌晨了"
        in 6..8 -> "早上好"
        in 9..10 -> "上午好"
        in 11..12 -> "中午好"
        in 13..16 -> "下午好"
        else -> "晚上好"
    }
}

@Composable
fun SearchShellHeader(
    title: String,
    subtitle: String,
    searchValue: String,
    onSearchValueChange: (String) -> Unit,
    searchPlaceholder: String,
    actionGlyph: IconToken,
    onAction: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(shellHeaderBrush())
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .height(HeaderContentHeight),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    style = SpineTheme.typography.display.copy(fontWeight = FontWeight.Bold),
                    color = colors.onPrimary,
                )
                Text(
                    text = subtitle,
                    style = SpineTheme.typography.subhead,
                    color = Color.White.copy(alpha = 0.72f),
                )
            }
            HeaderActionBubble(
                glyph = actionGlyph,
                onClick = onAction,
                bubbleSize = 46.dp,
                iconSize = 20.dp,
            )
        }
        HeaderSearchField(
            value = searchValue,
            onValueChange = onSearchValueChange,
            placeholder = searchPlaceholder,
        )
    }
}

@Composable
fun SimpleShellHeader(
    title: String,
    subtitle: String? = null,
    leadingGlyph: IconToken? = null,
    onLeadingAction: (() -> Unit)? = null,
    actionGlyph: IconToken? = null,
    onAction: (() -> Unit)? = null,
    actionsContent: (@Composable RowScope.() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(shellHeaderBrush())
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 14.dp)
            .height(HeaderContentHeight),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingGlyph != null && onLeadingAction != null) {
            HeaderActionBubble(glyph = leadingGlyph, onClick = onLeadingAction)
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = title,
                style = SpineTheme.typography.display.copy(fontWeight = FontWeight.Bold),
                color = colors.onPrimary,
            )
            subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = SpineTheme.typography.subhead,
                    color = Color.White.copy(alpha = 0.72f),
                )
            }
        }
        if (actionsContent != null) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                content = actionsContent,
            )
        } else if (actionGlyph != null && onAction != null) {
            HeaderActionBubble(glyph = actionGlyph, onClick = onAction)
        }
    }
}

@Composable
fun HeaderTextAction(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leadingGlyph: IconToken? = null,
    fill: Color = Color.White.copy(alpha = 0.14f),
    borderColor: Color = Color.White.copy(alpha = 0.12f),
    textColor: Color = Color.White,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(fill)
            .border(1.dp, borderColor, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingGlyph != null) {
            AppIcon(
                glyph = leadingGlyph,
                tint = textColor,
                modifier = Modifier.size(16.dp),
            )
        }
        Text(
            text = text,
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
            color = textColor,
        )
    }
}

@Composable
private fun HeaderSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
) {
    val colors = SpineTheme.colors
    val interactionSource = remember { MutableInteractionSource() }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface.copy(alpha = if (colors.isDark) 0.96f else 0.94f))
            .padding(horizontal = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(glyph = IconToken.SEARCH, tint = colors.textTertiary, modifier = Modifier.size(18.dp))
        Box(modifier = Modifier.weight(1f)) {
            if (value.isBlank()) {
                Text(
                    text = placeholder,
                    style = SpineTheme.typography.body,
                    color = colors.textTertiary,
                )
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                textStyle = SpineTheme.typography.body.copy(color = colors.textPrimary),
                cursorBrush = SolidColor(colors.primary),
                interactionSource = interactionSource,
            )
        }
    }
}

@Composable
private fun HeaderActionBubble(
    glyph: IconToken,
    onClick: () -> Unit,
    showBadge: Boolean = false,
    bubbleSize: Dp = 40.dp,
    iconSize: Dp = 18.dp,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .size(bubbleSize)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.18f))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(glyph = glyph, tint = colors.onPrimary, modifier = Modifier.size(iconSize))
        if (showBadge) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 8.dp, end = 8.dp)
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(colors.error)
                    .border(1.dp, colors.primary.copy(alpha = 0.88f), CircleShape),
            )
        }
    }
}

@Composable
private fun shellHeaderBrush(): Brush {
    val colors = SpineTheme.colors
    return remember(colors.primary, colors.headerHighlight, colors.isDark) {
        Brush.linearGradient(
            colors = listOf(
                colors.primary,
                colors.primary.copy(alpha = if (colors.isDark) 0.88f else 0.94f),
                colors.headerHighlight.copy(alpha = if (colors.isDark) 0.8f else 0.92f),
            ),
        )
    }
}
