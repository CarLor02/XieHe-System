package com.xiehe.spine.data

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.SessionStore
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.auth.SessionRefresher
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class AuthenticatedApiClient(
    internal val apiClient: ApiClient,
    private val sessionStore: SessionStore,
    private val sessionRefresher: SessionRefresher,
) {
    private val refreshMutex = Mutex()

    suspend fun <T> call(
        session: UserSession,
        block: suspend (accessToken: String) -> AppResult<T>,
    ): AppResult<Pair<UserSession, T>> {
        val initialSession = currentSession(session)
        when (val first = block(initialSession.accessToken)) {
            is AppResult.Success -> return AppResult.Success(initialSession to first.data)
            is AppResult.Failure -> {
                if (!first.isUnauthorized) {
                    return first
                }
            }
        }

        return when (val retrySession = resolveRetrySession(session, initialSession)) {
            is AppResult.Success -> {
                when (val second = block(retrySession.data.accessToken)) {
                    is AppResult.Success -> AppResult.Success(retrySession.data to second.data)
                    is AppResult.Failure -> second
                }
            }

            is AppResult.Failure -> retrySession
        }
    }

    private suspend fun resolveRetrySession(
        fallbackSession: UserSession,
        attemptedSession: UserSession,
    ): AppResult<UserSession> {
        return refreshMutex.withLock {
            val latest = currentSession(fallbackSession)
            if (latest.accessToken != attemptedSession.accessToken) {
                AppResult.Success(latest)
            } else {
                sessionRefresher.refresh(attemptedSession)
            }
        }
    }

    private fun currentSession(fallbackSession: UserSession): UserSession {
        return sessionStore.load()
            ?.takeIf { it.userId == fallbackSession.userId }
            ?: fallbackSession
    }
}
