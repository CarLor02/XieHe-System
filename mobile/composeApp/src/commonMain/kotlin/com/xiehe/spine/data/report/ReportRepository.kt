package com.xiehe.spine.data.report

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient

class ReportRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    suspend fun loadReports(
        session: UserSession,
        page: Int = 1,
        pageSize: Int = 20,
        patientId: Int? = null,
        status: String? = null,
        priority: String? = null,
        search: String? = null,
    ): AppResult<Pair<UserSession, ReportPageData>> {
        val params = buildList {
            add("page=$page")
            add("page_size=$pageSize")
            patientId?.let { add("patient_id=$it") }
            status?.trim()?.takeIf { it.isNotBlank() }?.let { add("status=$it") }
            priority?.trim()?.takeIf { it.isNotBlank() }?.let { add("priority=$it") }
            search?.trim()?.takeIf { it.isNotBlank() }?.let { add("search=$it") }
        }
        val path = buildString {
            append("/reports/")
            if (params.isNotEmpty()) {
                append("?")
                append(params.joinToString("&"))
            }
        }
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = path, accessToken = accessToken)
        }
    }

    suspend fun getReportDetail(
        session: UserSession,
        reportId: Int,
    ): AppResult<Pair<UserSession, ReportDetail>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = "/reports/$reportId", accessToken = accessToken)
        }
    }

    suspend fun createReport(
        session: UserSession,
        request: ReportCreateRequest,
    ): AppResult<Pair<UserSession, ReportDetail>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.post(path = "/reports/", body = request, accessToken = accessToken)
        }
    }

    suspend fun updateReport(
        session: UserSession,
        reportId: Int,
        request: ReportUpdateRequest,
    ): AppResult<Pair<UserSession, ReportDetail>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.put(
                path = "/reports/$reportId",
                body = request,
                accessToken = accessToken,
            )
        }
    }

    suspend fun deleteReport(
        session: UserSession,
        reportId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.deleteForMessage(
                path = "/reports/$reportId",
                accessToken = accessToken,
            )
        }
    }
}
