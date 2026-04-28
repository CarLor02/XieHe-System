package com.xiehe.spine.data.cache

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class AndroidImageBinaryStore(
    context: Context,
) : ImageBinaryStore {
    private val rootDir = File(context.filesDir, "image_cache").apply {
        if (!exists()) {
            mkdirs()
        }
    }

    override suspend fun read(userId: Int, fileId: Int): ByteArray? = withContext(Dispatchers.IO) {
        val target = imageFile(userId, fileId)
        if (!target.exists() || !target.isFile) {
            return@withContext null
        }
        runCatching { target.readBytes() }.getOrNull()
    }

    override suspend fun write(
        userId: Int,
        fileId: Int,
        bytes: ByteArray,
        mimeType: String?,
        fileName: String?,
    ) {
        withContext(Dispatchers.IO) {
            val target = imageFile(userId, fileId)
            target.parentFile?.mkdirs()
            val tmp = File(target.absolutePath + ".tmp")
            runCatching {
                tmp.outputStream().use { output ->
                    output.write(bytes)
                    output.flush()
                }
                if (target.exists()) {
                    target.delete()
                }
                tmp.renameTo(target)
            }.onFailure {
                tmp.delete()
            }
        }
    }

    override suspend fun delete(userId: Int, fileId: Int) {
        withContext(Dispatchers.IO) {
            imageFile(userId, fileId).delete()
        }
    }

    private fun imageFile(userId: Int, fileId: Int): File {
        return File(File(rootDir, "user_$userId"), "image_$fileId.bin")
    }
}
