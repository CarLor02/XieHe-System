package com.xiehe.spine.ui.components.card.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.patient.PatientDetail
import com.xiehe.spine.ui.components.card.image.imageStatusPresentation
import com.xiehe.spine.ui.components.card.image.inferExamType
import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun PatientBasicInfoCard(detail: PatientDetail) {
    val colors = SpineTheme.colors
    val avatarGradient = patientAvatarGradient(detail.gender)

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Brush.linearGradient(avatarGradient)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = detail.gender.ifBlank { "患" },
                        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                        color = Color.White,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = detail.name,
                        style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary,
                    )
                    Text(
                        text = detail.patientId,
                        style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Medium),
                        color = colors.textSecondary,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        InfoCapsule(text = detail.gender.ifBlank { "未填写" })
                        InfoCapsule(text = detail.age?.let { "${it}岁" } ?: "年龄未填写")
                    }
                }
            }
            PatientStatusBadge(status = detail.status)
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DetailHighlight(
                label = "联系电话",
                value = detail.phone.orDash(),
                modifier = Modifier.weight(1f),
            )
            DetailHighlight(
                label = "电子邮箱",
                value = detail.email.orDash(),
                modifier = Modifier.weight(1f),
            )
        }

        SectionDivider()

        DetailGridRow(
            leftLabel = "姓名",
            leftValue = detail.name,
            rightLabel = "患者编号",
            rightValue = detail.patientId,
        )
        DetailGridRow(
            leftLabel = "性别",
            leftValue = detail.gender.ifBlank { "-" },
            rightLabel = "出生日期",
            rightValue = formatBirthDate(detail.birthDate),
        )
        DetailGridRow(
            leftLabel = "年龄",
            leftValue = detail.age?.let { "${it}岁" } ?: "-",
            rightLabel = "身份证号码",
            rightValue = detail.idCard.orDash(),
        )
        DetailGridRow(
            leftLabel = "医保卡号",
            leftValue = detail.insuranceNumber.orDash(),
            rightLabel = "家庭地址",
            rightValue = detail.address.orDash(),
        )
        DetailGridRow(
            leftLabel = "紧急联系人",
            leftValue = detail.emergencyContactName.orDash(),
            rightLabel = "紧急联系电话",
            rightValue = detail.emergencyContactPhone.orDash(),
        )
    }
}

@Composable
fun PatientOverviewCards(
    detail: PatientDetail,
    relatedImages: List<ImageFileSummary>,
) {
    val imageCount = relatedImages.size.toString()
    val recentUpload = relatedImages
        .mapNotNull { it.createdAt ?: it.uploadedAt ?: it.studyDate }
        .maxOrNull()
        ?.let(::formatRecordDate)
        ?: "暂无记录"
    val archiveDate = deriveArchiveDate(detail.patientId, relatedImages)
    val medicalHistory = detail.medicalHistory
        ?.trim()
        ?.takeIf { it.isNotBlank() }
        ?: "暂无病史记录"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        VisitStatsCard(
            imageCount = imageCount,
            recentUpload = recentUpload,
            archiveDate = archiveDate,
            modifier = Modifier.weight(1f),
        )
        MedicalInfoCard(
            medicalHistory = medicalHistory,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
fun PatientImageRecordsCard(
    images: List<ImageFileSummary>,
    onOpenAnalysis: (Int, Int?, String) -> Unit,
    onUploadImage: () -> Unit,
) {
    val colors = SpineTheme.colors
    val records = images.sortedByDescending { it.createdAt ?: it.uploadedAt ?: it.studyDate.orEmpty() }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "影像记录",
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
            Button(
                text = "上传影像",
                onClick = onUploadImage,
                leadingGlyph = IconToken.UPLOAD,
                modifier = Modifier
                    .padding(8.dp, 4.dp)
                    .widthIn(min = 116.dp)
                    .height(34.dp),
            )
        }

        if (records.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(colors.surfaceMuted)
                    .padding(horizontal = 16.dp, vertical = 18.dp),
            ) {
                Text(
                    text = "暂无影像记录",
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
            }
            return@Card
        }

        RecordsHeaderRow()

        records.forEachIndexed { index, image ->
            ImageRecordRow(image = image, onOpenAnalysis = onOpenAnalysis)
            if (index != records.lastIndex) {
                SectionDivider()
            }
        }
    }
}

@Composable
private fun DetailGridRow(
    leftLabel: String,
    leftValue: String,
    rightLabel: String,
    rightValue: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        DetailGridCell(label = leftLabel, value = leftValue, modifier = Modifier.weight(1f))
        DetailGridCell(label = rightLabel, value = rightValue, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun DetailGridCell(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Medium),
            color = colors.textTertiary,
        )
        Text(
            text = value.ifBlank { "-" },
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
            maxLines = 3,
        )
    }
}

@Composable
private fun DetailHighlight(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surfaceMuted)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.textTertiary,
        )
        Text(
            text = value,
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textPrimary,
            maxLines = 1,
        )
    }
}

@Composable
private fun InfoCapsule(text: String) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(colors.primaryMuted)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = colors.primary,
        )
    }
}

@Composable
private fun PatientStatusBadge(status: String?) {
    val colors = SpineTheme.colors
    val active = status.isNullOrBlank() ||
        (!status.equals("inactive", ignoreCase = true) && status != "非活跃")
    val background = if (active) Color(0xFFECFDF5) else colors.surfaceMuted
    val border = if (active) Color(0xFFBBF7D0) else colors.borderSubtle
    val textColor = if (active) Color(0xFF059669) else colors.textSecondary

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Text(
            text = if (active) "活跃" else "非活跃",
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = textColor,
        )
    }
}

@Composable
private fun VisitStatsCard(
    imageCount: String,
    recentUpload: String,
    archiveDate: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Card(modifier = modifier) {
        Text(
            text = "就诊统计",
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
        )
        MetricRow(
            label = "影像数量",
            value = imageCount,
            valueColor = colors.primary,
            valueStyle = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
        )
        MetricRow(
            label = "最近上传",
            value = recentUpload,
            valueColor = colors.textSecondary,
        )
        MetricRow(
            label = "建档时间",
            value = archiveDate,
            valueColor = colors.textSecondary,
        )
    }
}

@Composable
private fun MedicalInfoCard(
    medicalHistory: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Card(modifier = modifier) {
        Text(
            text = "医疗信息",
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
        )
        Text(
            text = "既往病史",
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.textTertiary,
        )
        Text(
            text = medicalHistory,
            style = SpineTheme.typography.subhead,
            color = colors.textSecondary,
            maxLines = 4,
        )
    }
}

@Composable
private fun MetricRow(
    label: String,
    value: String,
    valueColor: Color,
    valueStyle: TextStyle = SpineTheme.typography.subhead,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.textTertiary,
            maxLines = 1,
        )
        Text(
            text = value,
            style = valueStyle,
            color = valueColor,
            maxLines = 1,
        )
    }
}

@Composable
private fun RecordsHeaderRow() {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 2.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RecordHeaderCell(text = "上传日期", weight = 1.35f)
        RecordHeaderCell(text = "文件名", weight = 1.65f)
        RecordHeaderCell(text = "类型", weight = 0.8f)
        RecordHeaderCell(text = "状态", weight = 1.0f)
        RecordHeaderCell(text = "操作", weight = 0.7f)
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(colors.borderSubtle),
    )
}

@Composable
private fun RowScope.RecordHeaderCell(
    text: String,
    weight: Float,
) {
    Box(
        modifier = Modifier.weight(weight),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.textTertiary,
            maxLines = 1,
        )
    }
}

@Composable
private fun ImageRecordRow(
    image: ImageFileSummary,
    onOpenAnalysis: (Int, Int?, String) -> Unit,
) {
    val colors = SpineTheme.colors
    val rawExamType = inferExamType(image)
    val examType = compactExamType(rawExamType)
    val status = imageStatusPresentation(image.status)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RecordValueCell(
            text = formatRecordDate(image.createdAt ?: image.uploadedAt ?: image.studyDate),
            weight = 1.35f,
            color = colors.textSecondary,
        )
        RecordValueCell(
            text = compactFileName(image.originalFilename),
            weight = 1.65f,
            color = colors.textPrimary,
            fontWeight = FontWeight.Medium,
        )
        RecordPillCell(
            text = examType,
            background = colors.primaryMuted,
            textColor = colors.primary,
            weight = 0.8f,
        )
        RecordPillCell(
            text = status.text,
            background = status.background,
            textColor = status.textColor,
            weight = 1.0f,
        )
        Box(
            modifier = Modifier.weight(0.7f),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "查看",
                modifier = Modifier.clickable { onOpenAnalysis(image.id, image.patientId, rawExamType) },
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = colors.primary,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun RowScope.RecordValueCell(
    text: String,
    weight: Float,
    color: Color,
    fontWeight: FontWeight = FontWeight.Normal,
) {
    Box(
        modifier = Modifier.weight(weight),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = fontWeight),
            color = color,
            maxLines = 1,
        )
    }
}

@Composable
private fun RowScope.RecordPillCell(
    text: String,
    background: Color,
    textColor: Color,
    weight: Float,
) {
    Box(
        modifier = Modifier.weight(weight),
        contentAlignment = Alignment.Center,
    ) {
        StatusPill(
            text = text,
            background = background,
            textColor = textColor,
        )
    }
}

@Composable
private fun StatusPill(
    text: String,
    background: Color,
    textColor: Color,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(background)
            .border(1.dp, textColor.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
            .padding(horizontal = 7.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = textColor,
            maxLines = 1,
        )
    }
}

@Composable
private fun SectionDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(SpineTheme.colors.borderSubtle.copy(alpha = 0.75f)),
    )
}

private fun patientAvatarGradient(gender: String): List<Color> {
    return if (gender == "女") {
        listOf(Color(0xFFF9A8D4), Color(0xFFEC4899))
    } else {
        listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9))
    }
}

private fun formatBirthDate(raw: String?): String {
    val normalized = raw?.trim().orEmpty()
    if (normalized.isBlank()) {
        return "-"
    }
    val datePart = normalized.take(10)
    val parts = datePart.split("-")
    return if (parts.size == 3) {
        "${parts[0]}年${parts[1]}月${parts[2]}日"
    } else {
        normalized
    }
}

private fun compactFileName(fileName: String): String {
    if (fileName.isBlank()) return "--"
    var units = 0
    val builder = StringBuilder()
    for (char in fileName) {
        val charUnits = if (char.code > 127) 2 else 1
        if (units + charUnits > 6) {
            return builder.append("...").toString()
        }
        builder.append(char)
        units += charUnits
    }
    return builder.toString()
}

private fun compactExamType(examType: String): String {
    return when (ImageCategory.fromRaw(examType) ?: ImageCategory.FRONT) {
        ImageCategory.FRONT -> "正位"
        ImageCategory.SIDE -> "侧位"
        ImageCategory.LEFT_BENDING -> "左曲"
        ImageCategory.RIGHT_BENDING -> "右曲"
        ImageCategory.POSTURE_PHOTO -> "体态"
    }
}

private fun formatRecordDate(raw: String?): String {
    val normalized = raw?.replace('T', ' ')?.trim().orEmpty()
    return when {
        normalized.length >= 10 -> normalized.take(10).replace('-', '/')
        normalized.isBlank() -> "--"
        else -> normalized
    }
}

private fun deriveArchiveDate(
    patientId: String,
    relatedImages: List<ImageFileSummary>,
): String {
    val digits = patientId.filter { it.isDigit() }
    if (digits.length >= 8) {
        return "${digits.take(4)}/${digits.drop(4).take(2)}/${digits.drop(6).take(2)}"
    }
    return relatedImages
        .mapNotNull { it.createdAt ?: it.uploadedAt ?: it.studyDate }
        .minOrNull()
        ?.let(::formatRecordDate)
        ?: "暂无记录"
}

private fun String?.orDash(): String {
    return this?.trim()?.takeIf { it.isNotBlank() } ?: "-"
}
