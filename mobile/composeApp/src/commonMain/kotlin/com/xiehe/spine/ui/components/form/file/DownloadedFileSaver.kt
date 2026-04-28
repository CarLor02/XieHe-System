package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

sealed interface FileSaveResult {
    data class Success(val location: String? = null) : FileSaveResult
    data class Failure(val message: String) : FileSaveResult
}

interface DownloadedFileSaver {
    suspend fun save(
        fileName: String,
        mimeType: String,
        bytes: ByteArray,
    ): FileSaveResult
}

@Composable
expect fun rememberDownloadedFileSaver(): DownloadedFileSaver

