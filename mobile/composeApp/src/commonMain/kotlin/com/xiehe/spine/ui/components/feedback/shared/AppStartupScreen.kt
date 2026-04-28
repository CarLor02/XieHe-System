package com.xiehe.spine.ui.components.feedback.shared

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.motion.AppMotion
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.components.text.shared.Text

@Composable
fun AppStartupScreen(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val transition = rememberInfiniteTransition(label = "app_startup_transition")
    val startAngle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = AppMotion.startupSpinSpec(),
        label = "app_startup_spin",
    )
    val backgroundBrush = remember(colors.primary, colors.info, colors.background) {
        Brush.verticalGradient(
            colors = listOf(
                colors.primary.copy(alpha = if (colors.isDark) 0.22f else 0.16f),
                colors.info.copy(alpha = if (colors.isDark) 0.18f else 0.12f),
                colors.background,
            ),
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(backgroundBrush),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .clip(CircleShape)
                    .background(colors.surface.copy(alpha = if (colors.isDark) 0.82f else 0.94f)),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(modifier = Modifier.size(48.dp)) {
                    val stroke = 5.dp.toPx()
                    drawArc(
                        color = colors.primaryMuted,
                        startAngle = 0f,
                        sweepAngle = 360f,
                        useCenter = false,
                        style = Stroke(width = stroke),
                    )
                    drawArc(
                        color = colors.primary,
                        startAngle = startAngle,
                        sweepAngle = 112f,
                        useCenter = false,
                        style = Stroke(width = stroke, cap = StrokeCap.Round),
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = title,
                    style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary,
                )
                Text(
                    text = message,
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
            }
        }
    }
}
