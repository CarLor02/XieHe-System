package com.xiehe.spine.ui.components.analysis.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun AnalysisTopBar(
    modifier: Modifier = Modifier,
    doctorName: String,
    examType: String,
    fileId: Int,
    patientId: Int?,
    onBack: () -> Unit,
    onSave: () -> Unit,
    onImportJson: () -> Unit,
    onExportJson: () -> Unit,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(80.dp)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        androidx.compose.ui.graphics.Color(0xFF6D28D9),
                        androidx.compose.ui.graphics.Color(0xFF7C3AED),
                        androidx.compose.ui.graphics.Color(0xFF5B21B6),
                    ),
                ),
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.2f))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(glyph = IconToken.BACK, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 10.dp, end = 10.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = "$doctorName · $examType",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = androidx.compose.ui.graphics.Color.White,
                maxLines = 1,
            )
            Text(
                text = "影像ID: $fileId｜患者ID: ${patientId ?: "--"}",
                style = SpineTheme.typography.caption,
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.88f),
                maxLines = 1,
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TopActionButton(
                text = "保存",
                icon = IconToken.SAVE,
                onClick = onSave,
                isPrimary = true,
                modifier = Modifier.height(48.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                TopActionButton(
                    text = "导入",
                    icon = IconToken.IMPORT,
                    onClick = onImportJson,
                    isPrimary = false,
                    modifier = Modifier.height(21.dp),
                )
                TopActionButton(
                    text = "导出",
                    icon = IconToken.EXPORT,
                    onClick = onExportJson,
                    isPrimary = false,
                    modifier = Modifier.height(21.dp),
                )
            }
        }
    }
}

@Composable
private fun TopActionButton(
    text: String,
    icon: IconToken,
    onClick: () -> Unit,
    isPrimary: Boolean,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(
                if (isPrimary) {
                    androidx.compose.ui.graphics.Color.White.copy(alpha = 0.24f)
                } else {
                    androidx.compose.ui.graphics.Color.White.copy(alpha = 0.15f)
                },
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(
            glyph = icon,
            tint = androidx.compose.ui.graphics.Color.White,
            modifier = Modifier.size(13.dp),
        )
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = androidx.compose.ui.graphics.Color.White,
            modifier = Modifier.padding(start = 3.dp),
        )
    }
}


