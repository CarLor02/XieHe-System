package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.button.shared.CompactButton
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun AnalysisReportPanel(
    examType: String,
    imageId: String,
    patientId: String,
    savedAt: String,
    generatedAt: String,
    reportText: String,
    onReportTextChange: (String) -> Unit,
    onGenerateByAi: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "报告信息",
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.SemiBold),
                color = SpineTheme.colors.textPrimary,
            )
            CompactButton(
                text = "AI生成报告",
                onClick = onGenerateByAi,
                containerColor = SpineTheme.colors.primary,
                contentColor = SpineTheme.colors.onPrimary,
            )
        }

        ReadOnlyReportField(label = "检查类型", value = examType)
        ReadOnlyReportField(label = "影像ID", value = imageId)
        ReadOnlyReportField(label = "患者ID", value = patientId)
        ReadOnlyReportField(label = "保存时间", value = savedAt)
        ReadOnlyReportField(label = "AI生成时间", value = generatedAt)
        ReadOnlyReportField(label = "报告编号", value = "")
        ReadOnlyReportField(label = "报告标题", value = "")
        ReadOnlyReportField(label = "临床病史", value = "")
        ReadOnlyReportField(label = "检查技术", value = "")
        ReadOnlyReportField(label = "检查所见", value = "")
        ReadOnlyReportField(label = "诊断意见", value = "")
        ReadOnlyReportField(label = "建议", value = "")
        ReadOnlyReportField(label = "主要诊断", value = "")
        ReadOnlyReportField(label = "次要诊断", value = "")
        ReadOnlyReportField(label = "优先级", value = "")
        ReadOnlyReportField(label = "状态", value = "")
        ReadOnlyReportField(label = "AI辅助", value = "")
        ReadOnlyReportField(label = "AI置信度", value = "")
        ReadOnlyReportField(label = "创建人", value = "")
        ReadOnlyReportField(label = "审核人", value = "")
        ReadOnlyReportField(label = "审核时间", value = "")

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "报告正文",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = SpineTheme.colors.textPrimary,
            )
            TextField(
                value = reportText,
                onValueChange = onReportTextChange,
                placeholder = "暂无报告内容",
                singleLine = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp),
            )
            Text(
                text = "保存标注时会一并保存当前报告内容",
                style = SpineTheme.typography.caption,
                color = SpineTheme.colors.textSecondary,
                modifier = Modifier.padding(horizontal = 2.dp),
            )
        }
    }
}

@Composable
private fun ReadOnlyReportField(
    label: String,
    value: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = label,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.textPrimary,
        )
        TextField(
            value = value.ifBlank { "--" },
            onValueChange = {},
            placeholder = "",
            readOnly = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}


