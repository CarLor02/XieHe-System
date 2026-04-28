package com.xiehe.spine.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.theme.AppThemeBrandColor
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.theme.ThemeMode
import com.xiehe.spine.ui.theme.previewBrandPrimaryColor
import com.xiehe.spine.ui.viewmodel.profile.AppearanceViewModel

private enum class SettingsPickerType {
    LANGUAGE,
    TIMEZONE,
}

@Composable
fun AppearanceScreen(vm: AppearanceViewModel) {
    AppearanceScreen(vm = vm, saveTrigger = 0)
}

@Composable
fun AppearanceScreen(
    vm: AppearanceViewModel,
    saveTrigger: Int,
) {
    val preference by vm.state.collectAsState()
    val colors = SpineTheme.colors
    val shadowColor = colors.textPrimary.copy(alpha = if (colors.isDark) 0.22f else 0.08f)
    var selectedBrand by remember(preference.brand) { mutableStateOf(preference.brand) }
    var darkModeEnabled by remember(preference.mode) { mutableStateOf(preference.mode == ThemeMode.DARK) }
    var notificationsEnabled by rememberSaveable { mutableStateOf(true) }
    var autoSaveEnabled by rememberSaveable { mutableStateOf(false) }
    var language by rememberSaveable { mutableStateOf("简体中文") }
    var timezone by rememberSaveable { mutableStateOf("北京时间 (UTC+8)") }
    var pickerType by remember { mutableStateOf<SettingsPickerType?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    val scrollState = rememberScrollState()

    LaunchedEffect(preference.brand, preference.mode) {
        selectedBrand = preference.brand
        darkModeEnabled = preference.mode == ThemeMode.DARK
    }

    LaunchedEffect(saveTrigger) {
        if (saveTrigger <= 0) {
            return@LaunchedEffect
        }
        vm.updateBrand(selectedBrand)
        vm.updateMode(if (darkModeEnabled) ThemeMode.DARK else ThemeMode.LIGHT)
        successMessage = buildString {
            append("设置已保存")
            if (!notificationsEnabled) append("，通知已关闭")
            if (autoSaveEnabled) append("，已启用自动保存")
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            SettingsBrandCard(
                selectedBrand = selectedBrand,
                onBrandSelected = {
                    selectedBrand = it
                    successMessage = null
                },
                shadowColor = shadowColor,
            )

            SettingsSectionCard(title = "界面设置", shadowColor = shadowColor) {
                SettingsToggleRow(
                    iconGlyph = IconToken.EYE,
                    iconTint = colors.primary,
                    iconBackground = colors.primaryMuted,
                    title = "启用暗色主题",
                    subtitle = "切换深色界面风格",
                    checked = darkModeEnabled,
                    onCheckedChange = {
                        darkModeEnabled = it
                        successMessage = null
                    },
                )
                SettingsDivider()
                SettingsToggleRow(
                    iconGlyph = IconToken.BELL,
                    iconTint = colors.info,
                    iconBackground = colors.info.copy(alpha = if (colors.isDark) 0.18f else 0.1f),
                    title = "显示系统通知",
                    subtitle = "接收消息和提醒推送",
                    checked = notificationsEnabled,
                    onCheckedChange = {
                        notificationsEnabled = it
                        successMessage = null
                    },
                )
                SettingsDivider()
                SettingsToggleRow(
                    iconGlyph = IconToken.SAVE,
                    iconTint = colors.warning,
                    iconBackground = colors.warning.copy(alpha = if (colors.isDark) 0.18f else 0.1f),
                    title = "自动保存草稿",
                    subtitle = "编辑内容自动暂存",
                    checked = autoSaveEnabled,
                    onCheckedChange = {
                        autoSaveEnabled = it
                        successMessage = null
                    },
                )
            }

            SettingsSectionCard(title = "语言和地区", shadowColor = shadowColor) {
                SettingsFieldLabel(
                    text = "语言",
                    iconGlyph = IconToken.MESSAGE,
                    iconTint = colors.info,
                    iconBackground = colors.info.copy(alpha = if (colors.isDark) 0.18f else 0.1f),
                )
                SettingsDropdownField(
                    text = language,
                    onClick = {
                        pickerType = SettingsPickerType.LANGUAGE
                        successMessage = null
                    },
                )
                Spacer(modifier = Modifier.height(8.dp))
                SettingsFieldLabel(
                    text = "时区",
                    iconGlyph = IconToken.CLOCK,
                    iconTint = colors.success,
                    iconBackground = colors.success.copy(alpha = if (colors.isDark) 0.18f else 0.1f),
                )
                SettingsDropdownField(
                    text = timezone,
                    onClick = {
                        pickerType = SettingsPickerType.TIMEZONE
                        successMessage = null
                    },
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        successMessage?.let { message ->
            FloatingToast(
                message = message,
                accentColor = colors.success,
                icon = IconToken.CHECK,
                onDismiss = { successMessage = null },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }
    }

    pickerType?.let { picker ->
        val title = if (picker == SettingsPickerType.LANGUAGE) "选择语言" else "选择时区"
        val options = if (picker == SettingsPickerType.LANGUAGE) {
            listOf("简体中文", "English")
        } else {
            listOf("北京时间 (UTC+8)", "东京时间 (UTC+9)", "新加坡时间 (UTC+8)")
        }
        OptionPickerOverlay(
            title = title,
            options = options,
            selected = if (picker == SettingsPickerType.LANGUAGE) language else timezone,
            onDismiss = { pickerType = null },
            onSelect = {
                if (picker == SettingsPickerType.LANGUAGE) {
                    language = it
                } else {
                    timezone = it
                }
            },
        )
    }
}

@Composable
private fun SettingsBrandCard(
    selectedBrand: AppThemeBrandColor,
    onBrandSelected: (AppThemeBrandColor) -> Unit,
    shadowColor: Color,
) {
    val colors = SpineTheme.colors
    SettingsSectionCard(title = "主色体系", shadowColor = shadowColor) {
        Text(
            text = "选择应用品牌色",
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.textSecondary,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppThemeBrandColor.entries.forEach { brand ->
                SettingsBrandDot(
                    color = previewBrandPrimaryColor(brand = brand, isDark = colors.isDark),
                    selected = selectedBrand == brand,
                    onClick = { onBrandSelected(brand) },
                )
            }
        }
    }
}

@Composable
private fun SettingsBrandDot(
    color: Color,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .size(40.dp)
            .shadow(
                if (selected) 10.dp else 0.dp,
                CircleShape,
                ambientColor = color.copy(alpha = if (colors.isDark) 0.28f else 0.2f),
                spotColor = color.copy(alpha = if (colors.isDark) 0.28f else 0.2f),
            )
            .clip(CircleShape)
            .background(color)
            .border(if (selected) 4.dp else 0.dp, colors.surface, CircleShape)
            .clickable(onClick = onClick),
    )
}

@Composable
private fun SettingsSectionCard(
    title: String,
    shadowColor: Color,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(24.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 620.dp)
            .shadow(14.dp, shape, ambientColor = shadowColor, spotColor = shadowColor)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, shape)
            .padding(horizontal = 16.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        content = {
            Text(
                text = title,
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Bold),
                color = colors.textSecondary,
            )
            content()
        },
    )
}

@Composable
private fun SettingsToggleRow(
    iconGlyph: IconToken,
    iconTint: Color,
    iconBackground: Color,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconBackground),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(glyph = iconGlyph, tint = iconTint, modifier = Modifier.size(16.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
                    color = colors.textPrimary,
                )
                Text(
                    text = subtitle,
                    style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Medium),
                    color = colors.textSecondary,
                )
            }
        }
        SettingsSwitch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun SettingsSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .size(width = 44.dp, height = 28.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(if (checked) colors.primary else colors.borderStrong)
            .clickable(onClick = { onCheckedChange(!checked) })
            .padding(horizontal = 3.dp),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .background(colors.surface),
        )
    }
}

@Composable
private fun SettingsFieldLabel(
    text: String,
    iconGlyph: IconToken,
    iconTint: Color,
    iconBackground: Color,
) {
    val colors = SpineTheme.colors
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBackground),
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(glyph = iconGlyph, tint = iconTint, modifier = Modifier.size(16.dp))
        }
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
            color = colors.textPrimary,
        )
    }
}

@Composable
private fun SettingsDropdownField(
    text: String,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surfaceMuted)
            .border(1.dp, colors.borderSubtle, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Medium),
            color = colors.textPrimary,
        )
        AppIcon(glyph = IconToken.CHEVRON_DOWN, tint = colors.textTertiary, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun SettingsDivider() {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(colors.borderSubtle),
    )
}
