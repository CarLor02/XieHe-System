package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.formatZoomPercent
import kotlin.math.roundToInt

private const val MIN_ZOOM_PERCENT = 100f
private const val MAX_ZOOM_PERCENT = 400f

@Composable
fun AnalysisSettingsPanel(
    zoomPercent: Float,
    contrast: Int,
    brightness: Int,
    onZoomChange: (Float) -> Unit,
    onZoomSet: (Float) -> Unit,
    onContrastChange: (Int) -> Unit,
    onBrightnessChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.backgroundElevated.copy(alpha = 0.98f), RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(colors.primaryMuted, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = IconToken.MEASURE_ZOOM,
                    tint = colors.primary,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                text = "影像缩放",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
        }

        ZoomControl(
            zoomPercent = zoomPercent,
            onZoomChange = onZoomChange,
            onZoomSet = onZoomSet,
        )

        AnalyzerStepper(
            label = "对比度",
            value = contrast.toString(),
            onMinus = { onContrastChange(-5) },
            onPlus = { onContrastChange(5) },
        )
        AnalyzerStepper(
            label = "亮度",
            value = brightness.toString(),
            onMinus = { onBrightnessChange(-5) },
            onPlus = { onBrightnessChange(5) },
        )
    }
}

@Composable
private fun ZoomControl(
    zoomPercent: Float,
    onZoomChange: (Float) -> Unit,
    onZoomSet: (Float) -> Unit,
) {
    val colors = SpineTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "缩放",
                style = SpineTheme.typography.body,
                color = colors.textPrimary,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StepperButton(icon = IconToken.MINUS, onClick = { onZoomChange(-10f) })
                Text(
                    text = formatZoomPercent(zoomPercent),
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                StepperButton(icon = IconToken.ADD, onClick = { onZoomChange(10f) })
            }
        }

        ContinuousZoomSlider(
            value = zoomPercent,
            onValueChange = onZoomSet,
        )
    }
}

@Composable
private fun ContinuousZoomSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
) {
    val colors = SpineTheme.colors
    val normalized = ((value - MIN_ZOOM_PERCENT) / (MAX_ZOOM_PERCENT - MIN_ZOOM_PERCENT)).coerceIn(0f, 1f)

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .pointerInput(Unit) {
                fun updateFromOffset(x: Float, width: Float) {
                    if (width <= 0f) return
                    val ratio = (x / width).coerceIn(0f, 1f)
                    onValueChange(MIN_ZOOM_PERCENT + ratio * (MAX_ZOOM_PERCENT - MIN_ZOOM_PERCENT))
                }

                detectTapGestures { offset ->
                    updateFromOffset(offset.x, size.width.toFloat())
                }
            }
            .pointerInput(Unit) {
                detectDragGestures { change, _ ->
                    change.consume()
                    val width = size.width.toFloat()
                    if (width <= 0f) return@detectDragGestures
                    onValueChange(
                        MIN_ZOOM_PERCENT +
                            (change.position.x / width).coerceIn(0f, 1f) * (MAX_ZOOM_PERCENT - MIN_ZOOM_PERCENT),
                    )
                }
            }
            .height(28.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        val trackWidth = maxWidth
        val thumbOffset = remember(normalized, trackWidth) {
            (trackWidth * normalized).coerceIn(0.dp, trackWidth)
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .background(colors.borderStrong, RoundedCornerShape(999.dp)),
        )
        Box(
            modifier = Modifier
                .fillMaxWidth(normalized)
                .height(6.dp)
                .background(colors.primary, RoundedCornerShape(999.dp)),
        )
        Box(
            modifier = Modifier
                .padding(start = (thumbOffset - 10.dp).coerceAtLeast(0.dp))
                .size(20.dp)
                .background(colors.surface, CircleShape),
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(10.dp)
                    .background(colors.primary, CircleShape),
            )
        }
    }
}

@Composable
private fun AnalyzerStepper(
    label: String,
    value: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.body,
            color = colors.textPrimary,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StepperButton(icon = IconToken.MINUS, onClick = onMinus)
            Text(
                text = value,
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            StepperButton(icon = IconToken.ADD, onClick = onPlus)
        }
    }
}

@Composable
private fun StepperButton(
    icon: IconToken,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .background(colors.surfaceMuted, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(glyph = icon, tint = colors.textPrimary)
    }
}
