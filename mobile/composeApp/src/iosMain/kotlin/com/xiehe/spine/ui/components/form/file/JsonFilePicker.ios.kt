package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

@Composable
actual fun rememberJsonFilePickerLauncher(
    onFilePicked: (LocalJsonFile?) -> Unit,
): JsonFilePickerLauncher {
    return object : JsonFilePickerLauncher {
        override fun launch() {
            launchIosJsonPicker(onFilePicked)
        }
    }
}
