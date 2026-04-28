package com.xiehe.spine.ui.components.card.welcomeInstruction

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

data class WelcomeInstructionStep(
    val icon: IconToken,
    val title: String,
    val body: String,
    val actionLabel: String,
    val actionIcon: IconToken,
)

@Composable
fun WelcomeInstructionCard(
    step: WelcomeInstructionStep,
    stepIndex: Int,
    totalSteps: Int,
    onSkip: () -> Unit,
    onBack: (() -> Unit)?,
    onNext: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val primaryBrush = Brush.linearGradient(listOf(colors.primary, colors.headerHighlight))
    val cardShape = RoundedCornerShape(36.dp)
    val progress = ((stepIndex + 1).toFloat() / totalSteps.coerceAtLeast(1)).coerceIn(0f, 1f)

    Column(
        modifier = modifier
            .widthIn(max = 398.dp)
            .shadow(
                elevation = 20.dp,
                shape = cardShape,
                ambientColor = colors.textPrimary.copy(alpha = 0.14f),
                spotColor = colors.textPrimary.copy(alpha = 0.14f),
            )
            .clip(cardShape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, cardShape),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .background(colors.primaryMuted.copy(alpha = if (colors.isDark) 0.4f else 0.65f)),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(8.dp)
                    .background(primaryBrush),
            )
        }

        Column(
            modifier = Modifier.padding(start = 26.dp, end = 26.dp, top = 22.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(112.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(primaryBrush),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = step.icon,
                    tint = colors.onPrimary,
                    modifier = Modifier.size(48.dp),
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                repeat(totalSteps) { index ->
                    val active = index == stepIndex
                    val indicatorWidth = if (active) 34.dp else 18.dp
                    val indicatorColor = if (active) {
                        colors.primary
                    } else {
                        colors.primaryMuted.copy(alpha = if (colors.isDark) 0.6f else 1f)
                    }
                    Box(
                        modifier = Modifier
                            .width(indicatorWidth)
                            .height(12.dp)
                            .clip(RoundedCornerShape(SpineTheme.radius.full))
                            .background(indicatorColor),
                    )
                }
            }

            Text(
                text = step.title,
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
            Text(
                text = step.body,
                style = SpineTheme.typography.body,
                color = colors.textTertiary,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = "跳过引导",
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
                    color = colors.textTertiary,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onSkip,
                    ),
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (onBack != null) {
                        Box(
                            modifier = Modifier
                                .size(width = 72.dp, height = 64.dp)
                                .clip(RoundedCornerShape(22.dp))
                                .background(colors.surfaceMuted)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                    onClick = onBack,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            AppIcon(
                                glyph = IconToken.BACK,
                                tint = colors.textSecondary,
                                modifier = Modifier.size(22.dp),
                            )
                        }
                    }

                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(22.dp))
                            .background(primaryBrush)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = onNext,
                            )
                            .padding(horizontal = if (onBack == null) 32.dp else 28.dp, vertical = 18.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = step.actionLabel,
                            style = SpineTheme.typography.subhead.copy(
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                            ),
                            color = colors.onPrimary,
                        )
                        AppIcon(
                            glyph = step.actionIcon,
                            tint = colors.onPrimary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
            }
        }
    }
}
