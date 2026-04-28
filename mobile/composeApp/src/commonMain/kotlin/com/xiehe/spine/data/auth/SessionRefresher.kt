package com.xiehe.spine.data.auth

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.SessionStore
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.ApiClient

class SessionRefresher(
    private val apiClient: ApiClient,
    private val sessionStore: SessionStore,
) {
    suspend fun refresh(session: UserSession): AppResult<UserSession> {
        return when (
            val result = apiClient.post<RefreshData, RefreshRequest>(
                path = "/auth/refresh",
                body = RefreshRequest(refreshToken = session.refreshToken),
            )
        ) {
            is AppResult.Success -> {
                val payload = result.data.tokens
                val next = session.copy(
                    accessToken = payload.accessToken,
                    refreshToken = payload.refreshToken,
                    accessTokenExpiresAtEpochSeconds = AuthRepository.resolveAccessTokenExpiry(
                        accessToken = payload.accessToken,
                        expiresIn = payload.expiresIn,
                    ),
                )
                sessionStore.save(next)
                AppResult.Success(next)
            }

            is AppResult.Failure -> {
                if (result.isUnauthorized) {
                    sessionStore.clear()
                }
                result
            }
        }
    }
}
