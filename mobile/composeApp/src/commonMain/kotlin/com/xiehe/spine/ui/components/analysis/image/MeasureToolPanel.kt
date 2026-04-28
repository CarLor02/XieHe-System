package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolDefinition
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolSection
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_STANDARD_DISTANCE
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun MeasureToolPanel(
    tools: List<AnnotationToolDefinition>,
    activeToolId: String,
    standardDistanceInput: String,
    standardDistanceLabel: String,
    onSelectTool: (String) -> Unit,
    onStandardDistanceChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val groupedTools = tools
        .filterNot { it.id == TOOL_STANDARD_DISTANCE }
        .groupBy { it.section }

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
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(colors.primaryMuted, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = IconToken.MEASURE_TOGGLE_TOOLKIT,
                    tint = colors.primary,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                text = "标注工具",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 420.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            AnnotationToolSection.entries.forEach { section ->
                val sectionTools = groupedTools[section].orEmpty()
                if (sectionTools.isEmpty()) return@forEach
                ToolSection(
                    title = section.title,
                    tools = sectionTools,
                    activeToolId = activeToolId,
                    onSelectTool = onSelectTool,
                )
            }

            StandardDistanceSection(
                selected = activeToolId == TOOL_STANDARD_DISTANCE,
                standardDistanceInput = standardDistanceInput,
                standardDistanceLabel = standardDistanceLabel,
                onSelectTool = { onSelectTool(TOOL_STANDARD_DISTANCE) },
                onStandardDistanceChange = onStandardDistanceChange,
            )
        }
    }
}

@Composable
private fun ToolSection(
    title: String,
    tools: List<AnnotationToolDefinition>,
    activeToolId: String,
    onSelectTool: (String) -> Unit,
) {
    val colors = SpineTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )

        tools.chunked(4).forEach { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                rowItems.forEach { item ->
                    val selected = item.id == activeToolId
                    ToolButton(
                        label = item.label,
                        icon = item.icon,
                        selected = selected,
                        modifier = Modifier.weight(1f),
                        onClick = { onSelectTool(item.id) },
                    )
                }
                repeat(4 - rowItems.size) {
                    Box(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ToolButton(
    label: String,
    icon: IconToken,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier
            .background(
                color = if (selected) colors.primaryMuted else colors.surface,
                shape = RoundedCornerShape(14.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(
                    color = if (selected) colors.primary.copy(alpha = 0.16f) else colors.surfaceMuted,
                    shape = RoundedCornerShape(10.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(
                glyph = icon,
                tint = if (selected) colors.primary else colors.textSecondary,
                modifier = Modifier.size(16.dp),
            )
        }
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = if (selected) colors.primary else colors.textPrimary,
            maxLines = 1,
        )
    }
}

@Composable
private fun StandardDistanceSection(
    selected: Boolean,
    standardDistanceInput: String,
    standardDistanceLabel: String,
    onSelectTool: () -> Unit,
    onStandardDistanceChange: (String) -> Unit,
) {
    val colors = SpineTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "标准距离",
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = if (selected) colors.primary else colors.surface,
                    shape = RoundedCornerShape(14.dp),
                )
                .clickable(onClick = onSelectTool)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(
                        color = if (selected) colors.onPrimary.copy(alpha = 0.18f) else colors.primaryMuted,
                        shape = RoundedCornerShape(10.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = IconToken.MEASURE_STANDARD_DISTANCE,
                    tint = if (selected) colors.onPrimary else colors.primary,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                text = "标准距离设置",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = if (selected) colors.onPrimary else colors.textPrimary,
            )
        }
        TextField(
            value = standardDistanceInput,
            onValueChange = onStandardDistanceChange,
            placeholder = "输入标准距离，默认 100",
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = standardDistanceLabel,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.success,
        )
    }
}
