package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

@Composable
actual fun rememberImageFilePickerLauncher(
    onFilePicked: (LocalImageFile?) -> Unit,
): ImageFilePickerLauncher {
    return object : ImageFilePickerLauncher {
        override fun launch() {
            launchIosImagePicker(onFilePicked)
        }
    }
}
