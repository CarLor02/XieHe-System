package com.xiehe.spine

import com.xiehe.spine.core.store.KeyValueStore
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.data.cache.ImageBinaryStore
import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import platform.Foundation.NSCachesDirectory
import platform.Foundation.NSSearchPathForDirectoriesInDomains
import platform.Foundation.NSTemporaryDirectory
import platform.Foundation.NSUserDefaults
import platform.Foundation.NSUserDomainMask
import platform.posix.S_IRWXU
import platform.posix.S_IRWXG
import platform.posix.S_IROTH
import platform.posix.S_IXOTH
import platform.posix.SEEK_END
import platform.posix.fclose
import platform.posix.fopen
import platform.posix.fread
import platform.posix.fseek
import platform.posix.ftell
import platform.posix.fwrite
import platform.posix.mkdir
import platform.posix.remove
import platform.posix.rewind

private const val defaultIosBaseUrl = "http://115.190.121.59:8080/api/v1"

private class IosKeyValueStore : KeyValueStore {
    private val defaults = NSUserDefaults.standardUserDefaults

    override fun getString(key: String): String? = defaults.stringForKey(key)

    override fun putString(key: String, value: String) {
        defaults.setObject(value, forKey = key)
    }

    override fun remove(key: String) {
        defaults.removeObjectForKey(key)
    }
}

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
private class IosImageBinaryStore : ImageBinaryStore {
    private val rootDir: String = run {
        val baseDir = (NSSearchPathForDirectoriesInDomains(
            directory = NSCachesDirectory,
            domainMask = NSUserDomainMask,
            expandTilde = true,
        ).firstOrNull() as? String) ?: NSTemporaryDirectory()
        val target = "$baseDir/image_cache"
        mkdir(target, (S_IRWXU or S_IRWXG or S_IROTH or S_IXOTH).convert())
        target
    }

    override suspend fun read(userId: Int, fileId: Int): ByteArray? = withContext(Dispatchers.Default) {
        val path = imageFile(userId, fileId)
        val file = fopen(path, "rb") ?: return@withContext null
        try {
            fseek(file, 0, SEEK_END)
            val size = ftell(file).toInt()
            rewind(file)
            if (size <= 0) {
                return@withContext ByteArray(0)
            }
            val buffer = ByteArray(size)
            buffer.usePinned { pinned ->
                fread(pinned.addressOf(0), 1.convert(), size.convert(), file)
            }
            buffer
        } finally {
            fclose(file)
        }
    }

    override suspend fun write(
        userId: Int,
        fileId: Int,
        bytes: ByteArray,
        mimeType: String?,
        fileName: String?,
    ) {
        withContext(Dispatchers.Default) {
            val userDir = "$rootDir/user_$userId"
            mkdir(userDir, (S_IRWXU or S_IRWXG or S_IROTH or S_IXOTH).convert())
            val target = imageFile(userId, fileId)
            val file = fopen(target, "wb") ?: return@withContext
            try {
                if (bytes.isNotEmpty()) {
                    bytes.usePinned { pinned ->
                        fwrite(pinned.addressOf(0), 1.convert(), bytes.size.convert(), file)
                    }
                }
            } finally {
                fclose(file)
            }
        }
    }

    override suspend fun delete(userId: Int, fileId: Int) {
        withContext(Dispatchers.Default) {
            remove(imageFile(userId, fileId))
        }
    }

    private fun imageFile(userId: Int, fileId: Int): String {
        return "$rootDir/user_$userId/image_$fileId.bin"
    }
}

fun createIosAppContainer(
    baseUrl: String = defaultIosBaseUrl,
    enableNetworkDiagnostics: Boolean = false,
): AppContainer {
    return AppContainer.create(
        store = IosKeyValueStore(),
        baseUrl = baseUrl,
        enableNetworkDiagnostics = enableNetworkDiagnostics,
        imageBinaryStore = IosImageBinaryStore(),
    )
}
