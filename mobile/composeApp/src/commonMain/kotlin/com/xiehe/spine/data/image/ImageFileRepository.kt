package com.xiehe.spine.data.image

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient
import com.xiehe.spine.data.ApiClient
import com.xiehe.spine.data.ApiEnvelope
import com.xiehe.spine.data.ApiErrorEnvelope
import com.xiehe.spine.data.patient.PatientDetail
import com.xiehe.spine.data.cache.ImageCacheRepository
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.collections.orEmpty

class ImageFileRepository(
    private val apiClient: ApiClient,
    private val authenticatedApiClient: AuthenticatedApiClient,
    private val cacheRepository: ImageCacheRepository,
) {
    private val fileLocks = mutableMapOf<Int, Mutex>()
    private val fileLocksGuard = Mutex()
    private val memoryCacheGuard = Mutex()
    private data class MemoryImageKey(val userId: Int, val fileId: Int)

    private val memoryImageCache = linkedMapOf<MemoryImageKey, ByteArray>()
    private val maxMemoryEntries = 24

    suspend fun loadImageFiles(session: UserSession): AppResult<Pair<UserSession, ImageFilePageData>> {
        return when (
            val result = authenticatedApiClient.call(session) { accessToken ->
                apiClient.get<ImageFilePageData>(path = "/image-files", accessToken = accessToken)
            }
        ) {
            is AppResult.Success -> {
                var activeSession = result.data.first
                var mergedItems = withPatientNameCache(activeSession.userId, result.data.second.items)

                val unresolvedIds = mergedItems
                    .asSequence()
                    .filter { it.patientId != null && it.patientName.isNullOrBlank() }
                    .mapNotNull { it.patientId }
                    .toSet()
                if (unresolvedIds.isNotEmpty()) {
                    val resolvedById = resolvePatientNamesByIds(activeSession, unresolvedIds)
                    activeSession = resolvedById.first
                    if (resolvedById.second.isNotEmpty()) {
                        cacheRepository.putPatientNameMap(activeSession.userId, resolvedById.second)
                        mergedItems = mergedItems.map { item ->
                            val patientId = item.patientId
                            if (patientId == null || !item.patientName.isNullOrBlank()) {
                                item
                            } else {
                                val resolvedName = resolvedById.second[patientId]
                                if (resolvedName.isNullOrBlank()) item else item.copy(patientName = resolvedName)
                            }
                        }
                    }
                }

                cacheRepository.putPagedImageSnapshot(
                    userId = activeSession.userId,
                    page = result.data.second.copy(items = mergedItems, fromCache = false),
                )
                cacheRepository.putPatientNameMap(
                    userId = activeSession.userId,
                    mergedItems
                        .mapNotNull { item ->
                            val patientId = item.patientId ?: return@mapNotNull null
                            val patientName = item.patientName?.trim().orEmpty()
                            if (patientName.isBlank()) null else (patientId to patientName)
                        }
                        .toMap(),
                )
                val payload = result.data.second.copy(items = mergedItems, fromCache = false)
                AppResult.Success(activeSession to payload)
            }

            is AppResult.Failure -> {
                val cachedPage = cacheRepository.getPagedImageSnapshot(session.userId)
                if (cachedPage == null || cachedPage.items.isEmpty() || result.isUnauthorized) {
                    result
                } else {
                    AppResult.Success(
                        session to cachedPage.copy(fromCache = true),
                    )
                }
            }
        }
    }

    suspend fun loadAllImageFiles(session: UserSession): AppResult<Pair<UserSession, List<ImageFileSummary>>> {
        var activeSession = session
        var page = 1
        var totalPages = 1
        val aggregate = linkedMapOf<Int, ImageFileSummary>()

        while (page <= totalPages) {
            val path = "/image-files?page=$page&page_size=50"
            when (
                val result = authenticatedApiClient.call(activeSession) { accessToken ->
                    apiClient.get<ImageFilePageData>(path = path, accessToken = accessToken)
                }
            ) {
                is AppResult.Success -> {
                    activeSession = result.data.first
                    val payload = result.data.second
                    payload.items.forEach { aggregate[it.id] = it }
                    totalPages = payload.pagination.totalPages.coerceAtLeast(1)
                    page += 1
                }

                is AppResult.Failure -> {
                    val fallback = cacheRepository.getCanonicalImageListSnapshot(activeSession.userId).orEmpty()
                    return if (fallback.isNotEmpty() && !result.isUnauthorized) {
                        AppResult.Success(activeSession to fallback)
                    } else {
                        result
                    }
                }
            }
        }

        var merged = withPatientNameCache(activeSession.userId, aggregate.values.toList())
        val unresolvedIds = merged
            .asSequence()
            .filter { it.patientId != null && it.patientName.isNullOrBlank() }
            .mapNotNull { it.patientId }
            .toSet()
        if (unresolvedIds.isNotEmpty()) {
            val resolvedById = resolvePatientNamesByIds(activeSession, unresolvedIds)
            activeSession = resolvedById.first
            if (resolvedById.second.isNotEmpty()) {
                cacheRepository.putPatientNameMap(activeSession.userId, resolvedById.second)
                merged = merged.map { item ->
                    val patientId = item.patientId
                    if (patientId == null || !item.patientName.isNullOrBlank()) {
                        item
                    } else {
                        val resolvedName = resolvedById.second[patientId]
                        if (resolvedName.isNullOrBlank()) item else item.copy(patientName = resolvedName)
                    }
                }
            }
        }
        cacheRepository.putCanonicalImageListSnapshot(activeSession.userId, merged)
        cacheRepository.putPatientNameMap(
            userId = activeSession.userId,
            merged
                .mapNotNull { item ->
                    val patientId = item.patientId ?: return@mapNotNull null
                    val patientName = item.patientName?.trim().orEmpty()
                    if (patientName.isBlank()) null else (patientId to patientName)
                }
                .toMap(),
        )
        return AppResult.Success(activeSession to merged)
    }

    suspend fun loadAllPatientImageFiles(
        session: UserSession,
        patientId: Int,
    ): AppResult<Pair<UserSession, List<ImageFileSummary>>> {
        var activeSession = session
        var page = 1
        var totalPages = 1
        val aggregate = linkedMapOf<Int, ImageFileSummary>()

        while (page <= totalPages) {
            val path = "/image-files/patient/$patientId?page=$page&page_size=50"
            when (
                val result = authenticatedApiClient.call(activeSession) { accessToken ->
                    apiClient.get<ImageFilePageData>(path = path, accessToken = accessToken)
                }
            ) {
                is AppResult.Success -> {
                    activeSession = result.data.first
                    val payload = result.data.second
                    payload.items.forEach { aggregate[it.id] = it }
                    totalPages = payload.pagination.totalPages.coerceAtLeast(1)
                    page += 1
                }

                is AppResult.Failure -> return result
            }
        }

        return AppResult.Success(activeSession to aggregate.values.toList())
    }

    suspend fun getImageFileDetail(
        session: UserSession,
        fileId: Int,
    ): AppResult<Pair<UserSession, ImageFileSummary>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.get(
                path = "/image-files/$fileId",
                accessToken = accessToken,
            )
        }
    }

    suspend fun getImageStatsSummary(
        session: UserSession,
    ): AppResult<Pair<UserSession, ImageStatsSummary>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.get(
                path = "/image-files/stats/summary",
                accessToken = accessToken,
            )
        }
    }

    suspend fun downloadImageBytes(
        session: UserSession,
        fileId: Int,
    ): AppResult<Pair<UserSession, ByteArray>> {
        getMemoryBytes(session.userId, fileId)?.let { cached ->
            return AppResult.Success(session to cached)
        }
        cacheRepository.getImageBytes(session.userId, fileId)?.let { cached ->
            putMemoryBytes(session.userId, fileId, cached)
            return AppResult.Success(session to cached)
        }

        val fileLock = lockForFile(fileId)
        return fileLock.withLock {
            cacheRepository.getImageBytes(session.userId, fileId)?.let { cached ->
                putMemoryBytes(session.userId, fileId, cached)
                return@withLock AppResult.Success(session to cached)
            }

            when (
                val network = authenticatedApiClient.call(session) { accessToken ->
                    val requestUrl = "${apiClient.baseUrl}/image-files/$fileId/download"
                    try {
                        val bytes = apiClient.httpClient.get(requestUrl) {
                            header(HttpHeaders.Authorization, "Bearer $accessToken")
                        }.body<ByteArray>()
                        AppResult.Success(bytes)
                    } catch (e: ClientRequestException) {
                        val status = e.response.status
                        AppResult.Failure(
                            message = "下载影像失败",
                            code = status.value,
                            isUnauthorized = status == HttpStatusCode.Unauthorized,
                            debugDetails = "[GET] $requestUrl status=${status.value}",
                        )
                    } catch (e: Exception) {
                        AppResult.Failure(
                            message = apiClient.classifyNetworkError(e.message),
                            debugDetails = "[GET] $requestUrl message=${e.message ?: "N/A"}",
                        )
                    }
                }
            ) {
                is AppResult.Success -> {
                    putMemoryBytes(network.data.first.userId, fileId, network.data.second)
                    cacheRepository.putImageBytes(
                        userId = network.data.first.userId,
                        fileId = fileId,
                        bytes = network.data.second,
                        mimeType = null,
                        fileName = null,
                    )
                    AppResult.Success(network.data)
                }

                is AppResult.Failure -> network
            }
        }
    }

    suspend fun evictImageCache(userId: Int, fileId: Int) {
        removeMemoryBytes(userId, fileId)
        cacheRepository.removeImage(userId, fileId)
    }

    suspend fun getCachedPatientName(userId: Int, patientId: Int): String? {
        return cacheRepository.getPatientNameById(userId, patientId)
    }

    suspend fun getCachedImageList(userId: Int): List<ImageFileSummary> {
        return cacheRepository.getCanonicalImageListSnapshot(userId).orEmpty()
    }

    suspend fun uploadSingleImage(
        session: UserSession,
        patientId: Int,
        examType: String,
        fileName: String,
        bytes: ByteArray,
        mimeType: String,
        description: String? = null,
    ): AppResult<Pair<UserSession, UploadSingleImageData>> {
        val safeDescription = description?.trim().orEmpty().ifBlank { examType.trim() }
        return authenticatedApiClient.call(session) { accessToken ->
            val requestUrl = "${apiClient.baseUrl}/upload/single"
            try {
                val envelope = apiClient.httpClient.post(requestUrl) {
                    header(HttpHeaders.Authorization, "Bearer $accessToken")
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("patient_id", patientId.toString())
                                append("description", safeDescription)
                                append(
                                    key = "file",
                                    value = bytes,
                                    headers = Headers.build {
                                        append(HttpHeaders.ContentType, mimeType)
                                        append(
                                            HttpHeaders.ContentDisposition,
                                            "form-data; name=\"file\"; filename=\"$fileName\"",
                                        )
                                    },
                                )
                            },
                        ),
                    )
                }.body<ApiEnvelope<UploadSingleImageData>>()
                val payload = envelope.data
                if (payload == null) {
                    AppResult.Failure(
                        message = envelope.message,
                        code = envelope.code,
                        isUnauthorized = envelope.code == HttpStatusCode.Unauthorized.value,
                        debugDetails = "[POST] $requestUrl code=${envelope.code} data=null",
                    )
                } else {
                    AppResult.Success(payload)
                }
            } catch (e: ClientRequestException) {
                val status = e.response.status
                val error = runCatching { e.response.body<ApiErrorEnvelope>() }.getOrNull()
                val bodyText = runCatching { e.response.bodyAsText() }.getOrNull()
                AppResult.Failure(
                    message = error?.message ?: "上传影像失败",
                    code = status.value,
                    isUnauthorized = status == HttpStatusCode.Unauthorized,
                    debugDetails = "[POST] $requestUrl status=${status.value} errorCode=${error?.errorCode ?: "N/A"} body=${bodyText ?: "N/A"}",
                )
            } catch (e: Exception) {
                AppResult.Failure(
                    message = apiClient.classifyNetworkError(e.message),
                    debugDetails = "[POST] $requestUrl message=${e.message ?: "N/A"}",
                )
            }
        }
    }

    suspend fun deleteImageFile(
        session: UserSession,
        imageId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return when (
            val result = authenticatedApiClient.call(session) { accessToken ->
                apiClient.deleteForMessage(
                    path = "/image-files/$imageId",
                    accessToken = accessToken,
                )
            }
        ) {
            is AppResult.Success -> {
                removeMemoryBytes(result.data.first.userId, imageId)
                cacheRepository.removeImage(result.data.first.userId, imageId)
                cacheRepository.removeImageItem(result.data.first.userId, imageId)
                AppResult.Success(result.data)
            }

            is AppResult.Failure -> result
        }
    }

    suspend fun updateAnnotation(
        session: UserSession,
        fileId: Int,
        annotation: String,
    ): AppResult<Pair<UserSession, ImageFileSummary>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.patch<ImageFileSummary, UpdateAnnotationRequest>(
                path = "/image-files/$fileId/annotation",
                body = UpdateAnnotationRequest(annotation = annotation),
                accessToken = accessToken,
            )
        }
    }

    private suspend fun withPatientNameCache(
        userId: Int,
        items: List<ImageFileSummary>,
    ): List<ImageFileSummary> {
        if (items.isEmpty()) {
            return items
        }
        return items.map { item ->
            val currentName = item.patientName?.trim().orEmpty()
            if (currentName.isNotBlank()) {
                item
            } else {
                val cachedName = item.patientId?.let { cacheRepository.getPatientNameById(userId, it) }
                if (cachedName.isNullOrBlank()) item else item.copy(patientName = cachedName)
            }
        }
    }

    private suspend fun resolvePatientNamesByIds(
        session: UserSession,
        patientIds: Set<Int>,
    ): Pair<UserSession, Map<Int, String>> {
        if (patientIds.isEmpty()) {
            return session to emptyMap()
        }
        var activeSession = session
        val resolved = linkedMapOf<Int, String>()
        patientIds.forEach { patientId ->
            val result = authenticatedApiClient.call(activeSession) { accessToken ->
                apiClient.get<PatientDetail>(
                    path = "/patients/$patientId",
                    accessToken = accessToken,
                )
            }
            if (result is AppResult.Success) {
                activeSession = result.data.first
                val name = result.data.second.name.trim()
                if (name.isNotBlank()) {
                    resolved[patientId] = name
                }
            }
        }
        return activeSession to resolved
    }

    private suspend fun lockForFile(fileId: Int): Mutex {
        fileLocksGuard.withLock {
            return fileLocks.getOrPut(fileId) { Mutex() }
        }
    }

    suspend fun clearMemoryCacheForUser(userId: Int) {
        memoryCacheGuard.withLock {
            memoryImageCache.keys.removeAll { it.userId == userId }
        }
    }

    private suspend fun getMemoryBytes(userId: Int, fileId: Int): ByteArray? {
        return memoryCacheGuard.withLock {
            memoryImageCache[MemoryImageKey(userId = userId, fileId = fileId)]
        }
    }

    private suspend fun putMemoryBytes(userId: Int, fileId: Int, bytes: ByteArray) {
        memoryCacheGuard.withLock {
            val key = MemoryImageKey(userId = userId, fileId = fileId)
            memoryImageCache.remove(key)
            memoryImageCache[key] = bytes
            while (memoryImageCache.size > maxMemoryEntries) {
                val eldest = memoryImageCache.entries.firstOrNull()?.key ?: break
                memoryImageCache.remove(eldest)
            }
        }
    }

    private suspend fun removeMemoryBytes(userId: Int, fileId: Int) {
        memoryCacheGuard.withLock {
            memoryImageCache.remove(MemoryImageKey(userId = userId, fileId = fileId))
        }
    }

}
