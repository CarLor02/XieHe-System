package com.xiehe.spine.ui.viewmodel.profile

import com.xiehe.spine.data.theme.ThemePreferenceRepository
import com.xiehe.spine.ui.theme.AppThemeBrandColor
import com.xiehe.spine.ui.theme.ThemeMode
import kotlinx.coroutines.flow.StateFlow

class AppearanceViewModel(
    private val repository: ThemePreferenceRepository,
) {
    val state: StateFlow<AppearanceUiState> = repository.preference

    fun updateBrand(brand: AppThemeBrandColor) {
        repository.updateBrand(brand)
    }

    fun updateMode(mode: ThemeMode) {
        repository.updateMode(mode)
    }
}
