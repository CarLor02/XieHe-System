package com.xiehe.spine.data.cache

interface ImageBinaryStore {
    suspend fun read(userId: Int, fileId: Int): ByteArray?
    suspend fun write(
        userId: Int,
        fileId: Int,
        bytes: ByteArray,
        mimeType: String? = null,
        fileName: String? = null,
    )

    suspend fun delete(userId: Int, fileId: Int)
}

class InMemoryImageBinaryStore : ImageBinaryStore {
    private val bytesById = mutableMapOf<String, ByteArray>()

    override suspend fun read(userId: Int, fileId: Int): ByteArray? = bytesById[namespacedKey(userId, fileId)]

    override suspend fun write(
        userId: Int,
        fileId: Int,
        bytes: ByteArray,
        mimeType: String?,
        fileName: String?,
    ) {
        bytesById[namespacedKey(userId, fileId)] = bytes.copyOf()
    }

    override suspend fun delete(userId: Int, fileId: Int) {
        bytesById.remove(namespacedKey(userId, fileId))
    }

    private fun namespacedKey(userId: Int, fileId: Int): String {
        return "user_$userId/image_$fileId.bin"
    }
}
