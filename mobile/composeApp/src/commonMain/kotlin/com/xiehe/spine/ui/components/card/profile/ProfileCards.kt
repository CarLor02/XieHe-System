package com.xiehe.spine.ui.components.card.profile

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineAppColors
import com.xiehe.spine.ui.theme.SpineTheme

enum class ProfileMenuTone {
    PRIMARY,
    INFO,
    WARNING,
    SUCCESS,
}

data class ProfileMenuPalette(
    private val tone: ProfileMenuTone,
) {
    @Composable
    fun baseColor(): Color = resolveToneColor(tone, SpineTheme.colors)
}

val ProfilePersonalInfoPalette = ProfileMenuPalette(ProfileMenuTone.PRIMARY)
val ProfileOrganizationPalette = ProfileMenuPalette(ProfileMenuTone.INFO)
val ProfilePasswordPalette = ProfileMenuPalette(ProfileMenuTone.WARNING)
val ProfileSettingsPalette = ProfileMenuPalette(ProfileMenuTone.SUCCESS)

@Composable
fun ProfileTag(
    text: String,
    active: Boolean,
) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(999.dp)
    val textColor = if (active) colors.onPrimary else colors.success
    val modifier = if (active) {
        Modifier.background(
            brush = Brush.linearGradient(listOf(colors.primary.copy(alpha = 0.82f), colors.primary)),
            shape = shape,
        )
    } else {
        Modifier.background(
            color = colors.success.copy(alpha = if (colors.isDark) 0.18f else 0.1f),
            shape = shape,
        )
    }
    Text(
        text = text,
        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Bold),
        color = textColor,
        modifier = modifier.padding(horizontal = 12.dp, vertical = 5.dp),
    )
}

@Composable
fun ProfileStat(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = value,
            style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
        )
        Text(
            text = label,
            style = SpineTheme.typography.caption,
            color = colors.textSecondary,
        )
    }
}

@Composable
fun ProfileMenuRow(
    label: String,
    glyph: IconToken,
    palette: ProfileMenuPalette,
    onClick: (() -> Unit)?,
    showDivider: Boolean,
) {
    val colors = SpineTheme.colors
    val baseColor = palette.baseColor()
    val shadowColor = baseColor.copy(alpha = if (colors.isDark) 0.26f else 0.18f)
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(61.dp)
                .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .shadow(
                            elevation = 14.dp,
                            shape = RoundedCornerShape(12.dp),
                            ambientColor = shadowColor,
                            spotColor = shadowColor,
                        )
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(baseColor.copy(alpha = 0.78f), baseColor),
                            ),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    AppIcon(glyph = glyph, tint = colors.onPrimary, modifier = Modifier.size(18.dp))
                }
                Text(
                    text = label,
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
                    color = colors.textPrimary,
                )
            }
            AppIcon(
                glyph = IconToken.CHEVRON_RIGHT,
                tint = colors.textTertiary,
                modifier = Modifier.size(16.dp),
            )
        }

        if (showDivider) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(1.dp)
                    .background(colors.borderSubtle),
            )
        }
    }
}

private fun resolveToneColor(
    tone: ProfileMenuTone,
    colors: SpineAppColors,
): Color = when (tone) {
    ProfileMenuTone.PRIMARY -> colors.primary
    ProfileMenuTone.INFO -> colors.info
    ProfileMenuTone.WARNING -> colors.warning
    ProfileMenuTone.SUCCESS -> colors.success
}
