package com.xiehe.spine.ui.components.card.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.image.ImageWorkflowStatus
import com.xiehe.spine.data.image.normalizeImageStatus
import com.xiehe.spine.ui.components.card.image.inferExamType
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.theme.resolve
import com.xiehe.spine.ui.viewmodel.dashboard.DashboardPendingTask

@Composable
fun PendingTaskCard(
    items: List<DashboardPendingTask>,
    onOpenAnalysis: (Int, Int?, String) -> Unit,
    onOpenImagesTab: () -> Unit,
) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 4.dp, height = 18.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(
                            Brush.verticalGradient(
                                listOf(colors.primary.copy(alpha = 0.9f), colors.primary),
                            ),
                        ),
                )
                Text(
                    text = "待处理任务",
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary,
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(colors.warning.copy(alpha = if (colors.isDark) 0.18f else 0.12f))
                    .padding(horizontal = 11.dp, vertical = 5.dp),
            ) {
                Text(
                    text = "${items.size} 项待审",
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Bold),
                    color = colors.warning,
                )
            }
        }

        if (items.isEmpty()) {
            Text(
                text = "暂无待处理影像",
                style = SpineTheme.typography.subhead,
                color = colors.textSecondary,
            )
        } else {
            items.forEachIndexed { index, item ->
                PendingTaskRow(item = item, onOpenAnalysis = onOpenAnalysis)
                if (index != items.lastIndex) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(colors.borderSubtle.copy(alpha = if (colors.isDark) 1f else 0.55f)),
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .border(
                    width = 1.dp,
                    color = colors.primary.copy(alpha = if (colors.isDark) 0.5f else 0.24f),
                    shape = RoundedCornerShape(14.dp),
                )
                .background(colors.surfaceMuted.copy(alpha = if (colors.isDark) 0.8f else 1f))
                .clickable(onClick = onOpenImagesTab)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "查看全部影像",
                style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
                color = colors.primary,
            )
            AppIcon(
                glyph = IconToken.ARROW_RIGHT,
                tint = colors.primary,
                modifier = Modifier.padding(start = 6.dp).size(16.dp),
            )
        }
    }
}

@Composable
private fun PendingTaskRow(
    item: DashboardPendingTask,
    onOpenAnalysis: (Int, Int?, String) -> Unit,
) {
    val colors = SpineTheme.colors
    val examType = inferExamType(item.image)
    val examStyle = pendingTaskExamStyle(examType)
    val priority = pendingTaskPriority(item)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Dashboard 待处理任务部分 列表项的 状态圆点，这里先不需要
//        Box(
//            modifier = Modifier
//                .size(8.dp)
//                .clip(CircleShape)
//                .background(priority.dotColor),
//        )

        // Dashboard 待处理任务部分 列表项的 用户图标，这里先不需要
//        Box(
//            modifier = Modifier
//                .size(40.dp)
//                .clip(RoundedCornerShape(12.dp))
//                .background(colors.primaryMuted),
//            contentAlignment = Alignment.Center,
//        ) {
//            AppIcon(
//                glyph = IconToken.USER_ROUND,
//                tint = colors.primary,
//                modifier = Modifier.size(18.dp),
//            )
//        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = item.patientName,
                    modifier = Modifier.weight(1f, fill = false),
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary,
                    maxLines = 1,
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(examStyle.background)
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                ) {
                    Text(
                        text = examType,
                        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                        color = examStyle.textColor,
                        maxLines = 1,
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = buildTaskMeta(item),
                    modifier = Modifier.weight(1f),
                    style = SpineTheme.typography.caption,
                    color = colors.textTertiary,
                    maxLines = 1,
                )
                // Dashboard 待处理任务的状态标签
//                Text(
//                    text = priority.label,
//                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
//                    color = priority.textColor,
//                )
            }
        }
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    Brush.linearGradient(
                        listOf(colors.primary.copy(alpha = 0.88f), colors.primary),
                    ),
                )
                .clickable {
                    onOpenAnalysis(
                        item.image.id,
                        item.image.patientId,
                        examType,
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(glyph = IconToken.ARROW_RIGHT, tint = Color.White, modifier = Modifier.size(18.dp))
        }
    }
}

private data class PendingTaskExamStyle(
    val background: Color,
    val textColor: Color,
)

private data class PendingTaskPriority(
    val dotColor: Color,
    val textColor: Color,
    val label: String,
)

@Composable
private fun pendingTaskExamStyle(examType: String): PendingTaskExamStyle {
    val style = SpineTheme.colors.examCategories.resolve(examType)
    return PendingTaskExamStyle(
        background = style.background,
        textColor = style.content,
    )
}

@Composable
private fun pendingTaskPriority(item: DashboardPendingTask): PendingTaskPriority {
    val colors = SpineTheme.colors
    return when (normalizeImageStatus(item.image.status)) {
        ImageWorkflowStatus.PROCESSING -> PendingTaskPriority(
            dotColor = colors.warning,
            textColor = colors.warning,
            label = "普通",
        )

        ImageWorkflowStatus.UPLOADED -> PendingTaskPriority(
            dotColor = colors.error,
            textColor = colors.error,
            label = "紧急",
        )

        else -> PendingTaskPriority(
            dotColor = colors.borderStrong,
            textColor = colors.textTertiary,
            label = "常规",
        )
    }
}

private fun buildTaskMeta(item: DashboardPendingTask): String {
    val timeLabel = extractTaskTime(item.image.createdAt)
    return if (timeLabel.isBlank()) {
        item.patientCode
    } else {
        "${item.patientCode} · $timeLabel"
    }
}

private fun extractTaskTime(createdAt: String?): String {
    val normalized = createdAt?.replace("T", " ")?.trim().orEmpty()
    if (normalized.isBlank()) {
        return ""
    }
    return Regex("""(\d{2}:\d{2})""").find(normalized)?.value ?: normalized.take(16)
}