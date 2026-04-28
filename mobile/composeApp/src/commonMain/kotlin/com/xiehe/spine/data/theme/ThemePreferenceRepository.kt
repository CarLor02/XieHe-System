package com.xiehe.spine.data.theme

import com.xiehe.spine.core.store.KeyValueStore
import com.xiehe.spine.ui.theme.AppThemeBrandColor
import com.xiehe.spine.ui.theme.ThemeMode
import com.xiehe.spine.ui.theme.ThemePreference
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ThemePreferenceRepository(
    private val store: KeyValueStore,
) {
    private val preferenceKey = "theme_preference"

    private val _preference = MutableStateFlow(loadPreference())
    val preference: StateFlow<ThemePreference> = _preference.asStateFlow()

    fun updateBrand(brand: AppThemeBrandColor) {
        val next = _preference.value.copy(brand = brand)
        persist(next)
    }

    fun updateMode(mode: ThemeMode) {
        val next = _preference.value.copy(mode = mode)
        persist(next)
    }

    private fun persist(value: ThemePreference) {
        store.putString(preferenceKey, "${encodeBrand(value.brand)}|${value.mode.name}")
        _preference.value = value
    }

    private fun loadPreference(): ThemePreference {
        val raw = store.getString(preferenceKey) ?: return ThemePreference()
        val parts = raw.split('|')
        val brand = decodeBrand(parts.getOrNull(0))
        val mode = ThemeMode.entries.firstOrNull { it.name == parts.getOrNull(1) } ?: ThemeMode.SYSTEM
        return ThemePreference(brand = brand, mode = mode)
    }

    private fun encodeBrand(brand: AppThemeBrandColor): String {
        return when (brand) {
            AppThemeBrandColor.PURPLE -> "PURPLE"
            AppThemeBrandColor.BLUE -> "BLUE"
            AppThemeBrandColor.GREEN -> "GREEN_V2"
        }
    }

    private fun decodeBrand(raw: String?): AppThemeBrandColor {
        return when (raw) {
            "PURPLE" -> AppThemeBrandColor.PURPLE
            "BLUE" -> AppThemeBrandColor.BLUE
            "GREEN_V2" -> AppThemeBrandColor.GREEN
            "GREEN" -> AppThemeBrandColor.GREEN
            else -> AppThemeBrandColor.GREEN
        }
    }
}
