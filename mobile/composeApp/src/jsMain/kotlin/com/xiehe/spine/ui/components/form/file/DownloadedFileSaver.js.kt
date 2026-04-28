package com.xiehe.spine.ui.components.form.file

import androidx.compose.runtime.Composable

@Composable
actual fun rememberDownloadedFileSaver(): DownloadedFileSaver {
    return object : DownloadedFileSaver {
        override suspend fun save(
            fileName: String,
            mimeType: String,
            bytes: ByteArray,
        ): FileSaveResult {
            return FileSaveResult.Failure("当前平台暂不支持下载保存")
        }
    }
}

