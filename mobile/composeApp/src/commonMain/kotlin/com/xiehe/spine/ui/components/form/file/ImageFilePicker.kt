package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

data class LocalImageFile(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

interface ImageFilePickerLauncher {
    fun launch()
}

@Composable
expect fun rememberImageFilePickerLauncher(
    onFilePicked: (LocalImageFile?) -> Unit,
): ImageFilePickerLauncher

