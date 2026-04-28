package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.analysis.viewer.domain.valueColorFor
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.ImageAnalysisMeasurement

@Composable
fun MeasurementResultsPanel(
    standardDistanceLabel: String,
    computedMeasurements: List<ImageAnalysisMeasurement>,
    detectedPoseFields: List<ImageAnalysisMeasurement>,
    hiddenKeys: Set<String>,
    onToggleItemVisibility: (String) -> Unit,
    onDeleteItem: (String) -> Unit,
    onShowAll: () -> Unit,
    onHideAll: () -> Unit,
    onShowComputed: () -> Unit,
    onHideComputed: () -> Unit,
    onShowDetected: () -> Unit,
    onHideDetected: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val hasHiddenItems = hiddenKeys.isNotEmpty()
    val computedKeys = computedMeasurements.map { it.key }
    val detectedKeys = detectedPoseFields.map { it.key }
    val allComputedHidden = computedKeys.isNotEmpty() && computedKeys.all(hiddenKeys::contains)
    val allDetectedHidden = detectedKeys.isNotEmpty() && detectedKeys.all(hiddenKeys::contains)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .background(colors.backgroundElevated.copy(alpha = 0.98f))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(colors.primaryMuted, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = IconToken.MEASURE_TOGGLE_MEASURE_LIST,
                    tint = colors.primary,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                text = "测量数据",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 8.dp),
            )
            AppIcon(
                glyph = if (hasHiddenItems) IconToken.EYE_OFF else IconToken.EYE,
                tint = colors.textSecondary,
                modifier = Modifier
                    .size(18.dp)
                    .clickable {
                        if (hasHiddenItems) onShowAll() else onHideAll()
                    },
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.primaryMuted, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Text(
                text = standardDistanceLabel,
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = colors.primary,
            )
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 360.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                SectionHeader(
                    title = "测量项",
                    hidden = allComputedHidden,
                    enabled = computedKeys.isNotEmpty(),
                    onToggle = {
                        if (allComputedHidden) onShowComputed() else onHideComputed()
                    },
                )
            }
            items(computedMeasurements, key = { it.key }) { item ->
                MeasurementRow(
                    title = item.type,
                    value = item.value,
                    hidden = hiddenKeys.contains(item.key),
                    showValue = true,
                    valueColor = valueColorFor(item, colors.annotationTools),
                    onToggle = { onToggleItemVisibility(item.key) },
                    onDelete = { onDeleteItem(item.key) },
                )
            }
            item {
                SectionDivider()
            }
            item {
                SectionHeader(
                    title = "关键点",
                    hidden = allDetectedHidden,
                    enabled = detectedKeys.isNotEmpty(),
                    onToggle = {
                        if (allDetectedHidden) onShowDetected() else onHideDetected()
                    },
                )
            }
            items(detectedPoseFields, key = { it.key }) { item ->
                MeasurementRow(
                    title = item.pointLabel ?: item.type,
                    value = item.value,
                    hidden = hiddenKeys.contains(item.key),
                    showValue = false,
                    valueColor = colors.annotationTools.detectedPoint,
                    onToggle = { onToggleItemVisibility(item.key) },
                    onDelete = { onDeleteItem(item.key) },
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    hidden: Boolean,
    enabled: Boolean,
    onToggle: () -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
            modifier = Modifier.weight(1f),
        )
        AppIcon(
            glyph = if (hidden) IconToken.EYE_OFF else IconToken.EYE,
            tint = if (enabled) colors.textSecondary else colors.textTertiary,
            modifier = Modifier
                .size(18.dp)
                .clickable(enabled = enabled, onClick = onToggle),
        )
    }
}

@Composable
private fun SectionDivider() {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(colors.borderSubtle, RoundedCornerShape(999.dp)),
    )
}

@Composable
private fun MeasurementRow(
    title: String,
    value: String,
    hidden: Boolean,
    valueColor: androidx.compose.ui.graphics.Color,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    showValue: Boolean,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surface, RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AppIcon(
            glyph = if (hidden) IconToken.EYE_OFF else IconToken.EYE,
            tint = if (hidden) colors.textTertiary else colors.textSecondary,
            modifier = Modifier
                .size(18.dp)
                .clickable(onClick = onToggle),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
                color = if (hidden) colors.textTertiary else colors.textPrimary,
                maxLines = 1,
            )
            if (showValue) {
                Text(
                    text = value,
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                    color = if (hidden) colors.textTertiary else valueColor,
                    maxLines = 1,
                )
            }
        }
        AppIcon(
            glyph = IconToken.DELETE,
            tint = if (hidden) colors.textTertiary else colors.textSecondary,
            modifier = Modifier
                .size(18.dp)
                .clickable(onClick = onDelete),
        )
    }
}
