package com.xiehe.spine.ui.components.form.file

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

@Composable
actual fun rememberDownloadedFileSaver(): DownloadedFileSaver {
    val context = LocalContext.current
    val resolver = context.contentResolver
    return remember(context, resolver) {
        object : DownloadedFileSaver {
            override suspend fun save(
                fileName: String,
                mimeType: String,
                bytes: ByteArray,
            ): FileSaveResult = withContext(Dispatchers.IO) {
                runCatching {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val values = ContentValues().apply {
                            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                            put(MediaStore.Downloads.MIME_TYPE, mimeType)
                            put(MediaStore.Downloads.IS_PENDING, 1)
                        }
                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                            ?: error("创建下载文件失败")
                        resolver.openOutputStream(uri)?.use { output ->
                            output.write(bytes)
                            output.flush()
                        } ?: error("无法写入下载文件")
                        values.clear()
                        values.put(MediaStore.Downloads.IS_PENDING, 0)
                        resolver.update(uri, values, null, null)
                        FileSaveResult.Success(uri.toString())
                    } else {
                        val parent = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                            ?: context.filesDir
                        val target = File(parent, fileName)
                        target.outputStream().use { output ->
                            output.write(bytes)
                            output.flush()
                        }
                        FileSaveResult.Success(target.absolutePath)
                    }
                }.getOrElse {
                    FileSaveResult.Failure(it.message ?: "保存下载文件失败")
                }
            }
        }
    }
}

