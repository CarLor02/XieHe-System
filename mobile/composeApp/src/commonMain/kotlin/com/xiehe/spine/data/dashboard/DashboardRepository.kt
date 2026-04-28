package com.xiehe.spine.data.dashboard

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient

class DashboardRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    suspend fun loadOverview(session: UserSession): AppResult<Pair<UserSession, DashboardOverview>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/dashboard/overview",
                accessToken = accessToken,
            )
        }
    }
}
