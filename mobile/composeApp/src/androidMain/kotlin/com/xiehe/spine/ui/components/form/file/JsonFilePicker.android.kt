package com.xiehe.spine.ui.components.form.file

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun rememberJsonFilePickerLauncher(
    onFilePicked: (LocalJsonFile?) -> Unit,
): JsonFilePickerLauncher {
    val context = LocalContext.current
    val resolver = context.contentResolver
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) {
            onFilePicked(null)
            return@rememberLauncherForActivityResult
        }
        runCatching {
            val mime = resolver.getType(uri) ?: "application/json"
            val name = resolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameColumn >= 0 && cursor.moveToFirst()) {
                    cursor.getString(nameColumn)
                } else {
                    null
                }
            } ?: "annotations.json"
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
            val text = bytes.decodeToString()
            if (text.isBlank()) null else LocalJsonFile(name = name, mimeType = mime, text = text)
        }.getOrNull().also(onFilePicked)
    }
    return remember(launcher) {
        object : JsonFilePickerLauncher {
            override fun launch() {
                launcher.launch(arrayOf("application/json", "text/plain"))
            }
        }
    }
}

