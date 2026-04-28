package com.xiehe.spine.data.measurement

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient

class MeasurementRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    suspend fun loadMeasurements(
        session: UserSession,
        imageId: Int,
    ): AppResult<Pair<UserSession, ImageMeasurementsData>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = "/measurements/$imageId", accessToken = accessToken)
        }
    }

    suspend fun saveMeasurements(
        session: UserSession,
        imageId: Int,
        request: SaveMeasurementsRequest,
    ): AppResult<Pair<UserSession, SaveMeasurementsResult>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.post(
                path = "/measurements/$imageId",
                body = request,
                accessToken = accessToken,
            )
        }
    }

    suspend fun generateReport(
        session: UserSession,
        request: GenerateReportRequest,
    ): AppResult<Pair<UserSession, GenerateReportResult>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.post(
                path = "/report-generation/generate",
                body = request,
                accessToken = accessToken,
            )
        }
    }
}
