package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

data class LocalJsonFile(
    val name: String,
    val mimeType: String,
    val text: String,
)

interface JsonFilePickerLauncher {
    fun launch()
}

@Composable
expect fun rememberJsonFilePickerLauncher(
    onFilePicked: (LocalJsonFile?) -> Unit,
): JsonFilePickerLauncher

