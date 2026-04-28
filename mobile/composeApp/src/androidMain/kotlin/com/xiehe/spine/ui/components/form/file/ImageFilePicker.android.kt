package com.xiehe.spine.ui.components.form.file

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun rememberImageFilePickerLauncher(
    onFilePicked: (LocalImageFile?) -> Unit,
): ImageFilePickerLauncher {
    val context = LocalContext.current
    val resolver = context.contentResolver
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) {
            onFilePicked(null)
            return@rememberLauncherForActivityResult
        }
        runCatching {
            val mime = resolver.getType(uri) ?: "image/png"
            val name = resolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameColumn >= 0 && cursor.moveToFirst()) {
                    cursor.getString(nameColumn)
                } else {
                    null
                }
            } ?: "upload_image.png"
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
            if (bytes.isEmpty()) null else LocalImageFile(name = name, mimeType = mime, bytes = bytes)
        }.getOrNull().also(onFilePicked)
    }
    return remember(launcher) {
        object : ImageFilePickerLauncher {
            override fun launch() {
                launcher.launch(arrayOf("image/*"))
            }
        }
    }
}

