package com.xiehe.spine.data.patient

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient
import com.xiehe.spine.data.cache.ImageCacheRepository
import io.ktor.http.encodeURLParameter

class PatientRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
    private val imageCacheRepository: ImageCacheRepository,
) {
    suspend fun loadAllPatients(session: UserSession): AppResult<Pair<UserSession, List<PatientSummary>>> {
        var activeSession = session
        var page = 1
        var totalPages = 1
        val aggregate = mutableListOf<PatientSummary>()

        while (page <= totalPages) {
            when (
                val result = loadPatients(
                    session = activeSession,
                    page = page,
                    pageSize = 50,
                    search = "",
                )
            ) {
                is AppResult.Success -> {
                    activeSession = result.data.first
                    val payload = result.data.second
                    aggregate += payload.items
                    totalPages = payload.pagination.totalPages.coerceAtLeast(1)
                    page += 1
                }

                is AppResult.Failure -> return result
            }
        }

        return AppResult.Success(activeSession to aggregate)
    }

    suspend fun loadPatients(
        session: UserSession,
        page: Int,
        pageSize: Int,
        search: String,
        gender: String? = null,
        ageMin: Int? = null,
        ageMax: Int? = null,
        status: String? = null,
    ): AppResult<Pair<UserSession, PatientPageData>> {
        val path = buildString {
            append("/patients/?page=")
            append(page)
            append("&page_size=")
            append(pageSize)
            if (search.isNotBlank()) {
                append("&search=")
                append(search.encodeURLParameter())
            }
            if (!gender.isNullOrBlank()) {
                append("&gender=")
                append(gender)
            }
            if (ageMin != null) {
                append("&age_min=")
                append(ageMin)
            }
            if (ageMax != null) {
                append("&age_max=")
                append(ageMax)
            }
            if (!status.isNullOrBlank()) {
                append("&status=")
                append(status.encodeURLParameter())
            }
        }
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = path, accessToken = accessToken)
        }
    }

    suspend fun loadPatientDetail(
        session: UserSession,
        patientId: Int,
    ): AppResult<Pair<UserSession, PatientDetail>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = "/patients/$patientId", accessToken = accessToken)
        }
    }

    suspend fun createPatient(
        session: UserSession,
        request: CreatePatientRequest,
    ): AppResult<Pair<UserSession, PatientDetail>> {
        return when (
            val result = authenticatedApiClient.call(session) { accessToken ->
                authenticatedApiClient.apiClient.post<PatientDetail, CreatePatientRequest>(
                    path = "/patients/",
                    body = request,
                    accessToken = accessToken,
                )
            }
        ) {
            is AppResult.Success -> {
                imageCacheRepository.syncPatientName(
                    userId = result.data.first.userId,
                    patientId = result.data.second.id,
                    patientName = result.data.second.name.trim(),
                )
                result
            }

            is AppResult.Failure -> result
        }
    }

    suspend fun updatePatient(
        session: UserSession,
        patientId: Int,
        request: UpdatePatientRequest,
    ): AppResult<Pair<UserSession, PatientDetail>> {
        return when (
            val result = authenticatedApiClient.call(session) { accessToken ->
                authenticatedApiClient.apiClient.put<PatientDetail, UpdatePatientRequest>(
                    path = "/patients/$patientId",
                    body = request,
                    accessToken = accessToken,
                )
            }
        ) {
            is AppResult.Success -> {
                imageCacheRepository.syncPatientName(
                    userId = result.data.first.userId,
                    patientId = patientId,
                    patientName = result.data.second.name.trim(),
                )
                result
            }

            is AppResult.Failure -> result
        }
    }

    suspend fun deletePatient(
        session: UserSession,
        patientId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return when (
            val result = authenticatedApiClient.call(session) { accessToken ->
                authenticatedApiClient.apiClient.deleteForMessage(
                    path = "/patients/$patientId",
                    accessToken = accessToken,
                )
            }
        ) {
            is AppResult.Success -> {
                imageCacheRepository.removePatient(
                    userId = result.data.first.userId,
                    patientId = patientId,
                )
                result
            }

            is AppResult.Failure -> result
        }
    }
}
