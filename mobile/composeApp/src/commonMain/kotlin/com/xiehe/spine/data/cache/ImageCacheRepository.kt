package com.xiehe.spine.data.cache

import com.xiehe.spine.core.store.KeyValueStore
import com.xiehe.spine.data.image.ImageFilePageData
import com.xiehe.spine.data.image.ImageFileSummary
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

class ImageCacheRepository(
    private val store: KeyValueStore,
    private val json: Json,
    private val binaryStore: ImageBinaryStore,
) {
    suspend fun getImageBytes(userId: Int, fileId: Int): ByteArray? {
        return binaryStore.read(userId = userId, fileId = fileId)
    }

    suspend fun putImageBytes(
        userId: Int,
        fileId: Int,
        bytes: ByteArray,
        mimeType: String?,
        fileName: String?,
    ) {
        binaryStore.write(
            userId = userId,
            fileId = fileId,
            bytes = bytes,
            mimeType = mimeType,
            fileName = fileName,
        )
    }

    suspend fun removeImage(userId: Int, fileId: Int) {
        binaryStore.delete(userId = userId, fileId = fileId)
    }

    fun getCanonicalImageListSnapshot(userId: Int): List<ImageFileSummary>? {
        val raw = store.getString(canonicalListKey(userId)) ?: return null
        return runCatching {
            json.decodeFromString(ListSerializer(ImageFileSummary.serializer()), raw)
        }.getOrNull()
    }

    fun putCanonicalImageListSnapshot(userId: Int, items: List<ImageFileSummary>) {
        val encoded = json.encodeToString(
            ListSerializer(ImageFileSummary.serializer()),
            items,
        )
        store.putString(canonicalListKey(userId), encoded)
    }

    fun getPagedImageSnapshot(userId: Int): ImageFilePageData? {
        val raw = store.getString(pagedListKey(userId)) ?: return null
        return runCatching {
            json.decodeFromString(ImageFilePageData.serializer(), raw)
        }.getOrNull()
    }

    fun putPagedImageSnapshot(userId: Int, page: ImageFilePageData) {
        store.putString(
            pagedListKey(userId),
            json.encodeToString(ImageFilePageData.serializer(), page),
        )
    }

    fun removeImageItem(userId: Int, fileId: Int) {
        getCanonicalImageListSnapshot(userId)?.let { current ->
            putCanonicalImageListSnapshot(userId, current.filterNot { it.id == fileId })
        }
        getPagedImageSnapshot(userId)?.let { current ->
            putPagedImageSnapshot(
                userId = userId,
                page = current.copy(items = current.items.filterNot { it.id == fileId }),
            )
        }
    }

    fun getPatientNameById(userId: Int, patientId: Int): String? {
        return getPatientNameMap(userId)[patientId.toString()]
    }

    fun putPatientNameMap(userId: Int, map: Map<Int, String>) {
        if (map.isEmpty()) {
            return
        }
        val current = getPatientNameMap(userId).toMutableMap()
        map.forEach { (id, name) ->
            if (name.isNotBlank()) {
                current[id.toString()] = name
            }
        }
        val encoded = json.encodeToString(
            MapSerializer(String.serializer(), String.serializer()),
            current,
        )
        store.putString(patientNameKey(userId), encoded)
    }

    fun syncPatientName(userId: Int, patientId: Int, patientName: String) {
        if (patientName.isBlank()) {
            return
        }
        putPatientNameMap(userId, mapOf(patientId to patientName))
        updatePatientNameInSnapshots(userId, patientId, patientName)
    }

    fun removePatient(userId: Int, patientId: Int) {
        val updatedMap = getPatientNameMap(userId).toMutableMap().apply {
            remove(patientId.toString())
        }
        store.putString(
            patientNameKey(userId),
            json.encodeToString(MapSerializer(String.serializer(), String.serializer()), updatedMap),
        )
        updatePatientNameInSnapshots(userId, patientId, patientName = null)
    }

    private fun updatePatientNameInSnapshots(userId: Int, patientId: Int, patientName: String?) {
        getCanonicalImageListSnapshot(userId)?.let { current ->
            putCanonicalImageListSnapshot(
                userId = userId,
                items = current.map { item ->
                    if (item.patientId == patientId) item.copy(patientName = patientName) else item
                },
            )
        }
        getPagedImageSnapshot(userId)?.let { current ->
            putPagedImageSnapshot(
                userId = userId,
                page = current.copy(
                    items = current.items.map { item ->
                        if (item.patientId == patientId) item.copy(patientName = patientName) else item
                    },
                ),
            )
        }
    }

    private fun getPatientNameMap(userId: Int): Map<String, String> {
        val raw = store.getString(patientNameKey(userId)) ?: return emptyMap()
        return runCatching {
            json.decodeFromString(
                MapSerializer(String.serializer(), String.serializer()),
                raw,
            )
        }.getOrDefault(emptyMap())
    }

    private fun canonicalListKey(userId: Int): String {
        return "image_cache.user_${userId}.canonical_list.v1"
    }

    private fun pagedListKey(userId: Int): String {
        return "image_cache.user_${userId}.page_snapshot.v1"
    }

    private fun patientNameKey(userId: Int): String {
        return "image_cache.user_${userId}.patient_name_map.v1"
    }
}
