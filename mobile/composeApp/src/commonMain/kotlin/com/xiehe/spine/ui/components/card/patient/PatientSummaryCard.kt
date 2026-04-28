package com.xiehe.spine.ui.components.card.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.patient.PatientSummary
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun PatientSummaryCard(
    patient: PatientSummary,
    onOpenPatient: () -> Unit,
    onEditPatient: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val genderStyle = patientSummaryGenderStyle(patient.gender)
    val genderLabel = normalizePatientGender(patient.gender)
    val ageText = patient.age?.let { "${it}岁" } ?: "年龄未填写"
    val phoneText = patient.phone
        ?.takeIf { it.isNotBlank() }
        ?.let(::maskPhoneNumber)
        ?: "无手机号"

    Card(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = patient.name,
                        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary,
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(genderStyle.background)
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = genderLabel,
                            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
                            color = genderStyle.content,
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = ageText,
                        style = SpineTheme.typography.subhead,
                        color = colors.textSecondary,
                    )
                    Text(
                        text = "·",
                        style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.textTertiary,
                    )
                    AppIcon(glyph = IconToken.PHONE, tint = colors.textTertiary, modifier = Modifier.size(14.dp))
                    Text(
                        text = phoneText,
                        style = SpineTheme.typography.subhead,
                        color = colors.textSecondary,
                        maxLines = 1,
                    )
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PatientSummaryIconAction(
                    glyph = IconToken.EDIT,
                    background = colors.success.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
                    tint = colors.success,
                    onClick = onEditPatient,
                )
                PatientSummaryIconAction(
                    glyph = IconToken.EYE,
                    background = colors.primary,
                    tint = colors.onPrimary,
                    onClick = onOpenPatient,
                )
            }
        }
    }
}

@Composable
private fun PatientSummaryIconAction(
    glyph: IconToken,
    background: androidx.compose.ui.graphics.Color,
    tint: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(
            glyph = glyph,
            tint = tint,
            modifier = Modifier.size(16.dp),
        )
    }
}

private data class PatientSummaryGenderStyle(
    val background: androidx.compose.ui.graphics.Color,
    val content: androidx.compose.ui.graphics.Color,
)

@Composable
private fun patientSummaryGenderStyle(gender: String): PatientSummaryGenderStyle {
    val colors = SpineTheme.colors
    return if (normalizePatientGender(gender) == "女") {
        PatientSummaryGenderStyle(
            background = colors.warning.copy(alpha = if (colors.isDark) 0.2f else 0.14f),
            content = colors.warning,
        )
    } else {
        PatientSummaryGenderStyle(
            background = colors.info.copy(alpha = if (colors.isDark) 0.2f else 0.14f),
            content = colors.info,
        )
    }
}

private fun normalizePatientGender(gender: String): String {
    return when (gender.trim().lowercase()) {
        "female", "女" -> "女"
        else -> "男"
    }
}

private fun maskPhoneNumber(phone: String): String {
    val digits = phone.filter(Char::isDigit)
    if (digits.length < 7) return phone
    val prefix = digits.take(3)
    val suffix = digits.takeLast(4)
    return "$prefix****$suffix"
}
