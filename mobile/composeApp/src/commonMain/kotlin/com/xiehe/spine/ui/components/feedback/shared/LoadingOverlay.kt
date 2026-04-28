package com.xiehe.spine.ui.components.feedback.shared

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.motion.AppMotion
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.components.text.shared.Text

@Composable
fun LoadingOverlay(
    message: String = "正在加载中...",
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val transition = rememberInfiniteTransition(label = "loading_spin_transition")
    val startAngle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = AppMotion.loadingSpinSpec(),
        label = "loading_spin_angle",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.45f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {},
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Canvas(modifier = Modifier.size(46.dp)) {
                val stroke = 5.dp.toPx()
                drawArc(
                    color = colors.surfaceMuted.copy(alpha = 0.9f),
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = stroke),
                )
                drawArc(
                    color = colors.primary,
                    startAngle = startAngle,
                    sweepAngle = 108f,
                    useCenter = false,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }

            Text(
                text = message,
                style = SpineTheme.typography.subhead,
                color = colors.onPrimary,
            )
        }
    }
}
