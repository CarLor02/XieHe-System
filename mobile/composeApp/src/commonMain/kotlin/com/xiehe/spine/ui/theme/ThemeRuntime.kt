package com.xiehe.spine.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import com.xiehe.spine.currentHour24

private val LocalSpineColors = compositionLocalOf { lightPalette(AppThemeBrandColor.PURPLE) }
private val LocalSpineTypography = compositionLocalOf { defaultTypography() }
private val LocalSpineSpacing = compositionLocalOf { DefaultSpineAppSpacing }
private val LocalSpineRadius = compositionLocalOf { DefaultSpineAppRadius }

object SpineTheme {
    val colors: SpineAppColors
        @Composable get() = LocalSpineColors.current

    val typography: SpineAppTypography
        @Composable get() = LocalSpineTypography.current

    val spacing: SpineAppSpacing
        @Composable get() = LocalSpineSpacing.current

    val radius: SpineAppRadius
        @Composable get() = LocalSpineRadius.current
}

@Composable
fun SpineTheme(
    preference: ThemePreference,
    content: @Composable () -> Unit,
) {
    val dark = when (preference.mode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.AUTO_TIME -> {
            val hour = currentHour24()
            hour !in 7..<20
        }

        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    val colors = remember(preference.brand, dark) {
        if (dark) darkPalette(preference.brand) else lightPalette(preference.brand)
    }

    CompositionLocalProvider(
        LocalSpineColors provides colors,
        LocalSpineTypography provides defaultTypography(),
        LocalSpineSpacing provides DefaultSpineAppSpacing,
        LocalSpineRadius provides DefaultSpineAppRadius,
        content = content,
    )
}
