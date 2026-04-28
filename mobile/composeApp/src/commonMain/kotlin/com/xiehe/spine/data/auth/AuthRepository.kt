package com.xiehe.spine.data.auth

import com.xiehe.spine.currentEpochSeconds
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.SessionStore
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient
import com.xiehe.spine.data.ApiClient
import com.xiehe.spine.data.HealthData
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class AuthRepository(
    private val apiClient: ApiClient,
    private val sessionStore: SessionStore,
    private val sessionRefresher: SessionRefresher,
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    private val refreshLeewaySeconds = 180L

    suspend fun healthCheck(): AppResult<HealthData> {
        return apiClient.get(path = "/health/")
    }

    fun restoreSession(): UserSession? {
        val loaded = sessionStore.load() ?: return null
        if (loaded.accessTokenExpiresAtEpochSeconds != null) {
            return loaded
        }
        val patched = loaded.copy(
            accessTokenExpiresAtEpochSeconds = resolveAccessTokenExpiry(
                accessToken = loaded.accessToken,
                expiresIn = null,
            ) ?: (currentEpochSeconds() + 300L),
        )
        sessionStore.save(patched)
        return patched
    }

    suspend fun login(
        username: String,
        password: String,
        rememberMe: Boolean = false,
    ): AppResult<UserSession> {
        return when (
            val result = apiClient.post<LoginData, LoginRequest>(
                path = "/auth/login",
                body = LoginRequest(username = username, password = password, rememberMe = rememberMe),
            )
        ) {
            is AppResult.Success -> {
                val payload = result.data
                val session = UserSession(
                    accessToken = payload.accessToken,
                    refreshToken = payload.refreshToken,
                    userId = payload.user.id,
                    username = payload.user.username,
                    email = payload.user.email,
                    fullName = payload.user.fullName,
                    avatarUrl = payload.user.avatarUrl,
                    avatar = payload.user.avatar,
                    isSuperuser = payload.user.isSuperuser,
                    isSystemAdmin = payload.user.isSystemAdmin,
                    accessTokenExpiresAtEpochSeconds = resolveAccessTokenExpiry(
                        accessToken = payload.accessToken,
                        expiresIn = payload.expiresIn,
                    ),
                )
                sessionStore.save(session)
                AppResult.Success(session)
            }

            is AppResult.Failure -> result
        }
    }

    suspend fun refreshToken(session: UserSession): AppResult<UserSession> {
        return sessionRefresher.refresh(session)
    }

    suspend fun register(
        username: String,
        email: String,
        password: String,
        confirmPassword: String,
        fullName: String,
        phone: String?,
    ): AppResult<UserDto> {
        return when (
            val result = apiClient.post<RegisterData, RegisterRequest>(
                path = "/auth/register",
                body = RegisterRequest(
                    username = username,
                    email = email,
                    password = password,
                    confirmPassword = confirmPassword,
                    fullName = fullName,
                    phone = phone,
                ),
            )
        ) {
            is AppResult.Success -> AppResult.Success(result.data.user)
            is AppResult.Failure -> result
        }
    }

    suspend fun verifyCurrentPassword(
        username: String,
        password: String,
    ): AppResult<Unit> {
        return when (
            val result = apiClient.post<LoginData, LoginRequest>(
                path = "/auth/login",
                body = LoginRequest(
                    username = username,
                    password = password,
                    rememberMe = false,
                ),
            )
        ) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    suspend fun getCurrentUser(
        session: UserSession,
    ): AppResult<Pair<UserSession, CurrentUserProfile>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.get<CurrentUserProfile>(path = "/auth/me", accessToken = accessToken)
        }.mapSessionAndSave { base, profile ->
            profileToSession(base, profile)
        }
    }

    suspend fun updateCurrentUser(
        session: UserSession,
        request: UpdateCurrentUserRequest,
    ): AppResult<Pair<UserSession, CurrentUserProfile>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.put<CurrentUserProfile, UpdateCurrentUserRequest>(
                path = "/auth/me",
                body = request,
                accessToken = accessToken,
            )
        }.mapSessionAndSave { base, profile ->
            profileToSession(base, profile)
        }
    }

    suspend fun requestPasswordReset(email: String): AppResult<String> {
        return apiClient.postForMessage(
            path = "/auth/password/reset",
            body = PasswordResetRequest(email = email),
        )
    }

    suspend fun confirmPasswordReset(
        token: String,
        newPassword: String,
        confirmPassword: String,
    ): AppResult<String> {
        return apiClient.postForMessage(
            path = "/auth/password/reset/confirm",
            body = PasswordResetConfirmRequest(
                token = token,
                newPassword = newPassword,
                confirmPassword = confirmPassword,
            ),
        )
    }

    suspend fun changePassword(
        session: UserSession,
        currentPassword: String,
        newPassword: String,
        confirmPassword: String,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            apiClient.postForMessage(
                path = "/auth/password/change",
                body = PasswordChangeRequest(
                    currentPassword = currentPassword,
                    newPassword = newPassword,
                    confirmPassword = confirmPassword,
                ),
                accessToken = accessToken,
            )
        }
    }

    suspend fun ensureFreshSession(session: UserSession): AppResult<UserSession> {
        val expiresAt = session.accessTokenExpiresAtEpochSeconds ?: return AppResult.Success(session)
        val remainingSeconds = expiresAt - currentEpochSeconds()
        return if (remainingSeconds > refreshLeewaySeconds) {
            AppResult.Success(session)
        } else {
            sessionRefresher.refresh(session)
        }
    }

    fun logout() {
        sessionStore.clear()
    }

    suspend fun logout(session: UserSession): AppResult<String> {
        val result = authenticatedApiClient.call(session) { accessToken ->
            apiClient.postForMessage(
                path = "/auth/logout",
                accessToken = accessToken,
            )
        }
        sessionStore.clear()
        return when (result) {
            is AppResult.Success -> AppResult.Success(result.data.second)
            is AppResult.Failure -> result
        }
    }

    private inline fun <T> AppResult<Pair<UserSession, T>>.mapSessionAndSave(
        mapper: (UserSession, T) -> UserSession,
    ): AppResult<Pair<UserSession, T>> {
        return when (this) {
            is AppResult.Success -> {
                val base = data.first
                val payload = data.second
                val updated = mapper(base, payload)
                sessionStore.save(updated)
                AppResult.Success(updated to payload)
            }

            is AppResult.Failure -> this
        }
    }

    private fun profileToSession(
        base: UserSession,
        profile: CurrentUserProfile,
    ): UserSession {
        return base.copy(
            userId = profile.id,
            username = profile.username,
            email = profile.email ?: base.email,
            fullName = profile.fullName ?: profile.realName ?: base.fullName,
            isSuperuser = profile.isSuperuser,
            isSystemAdmin = profile.isSystemAdmin,
        )
    }

    companion object {
        @OptIn(ExperimentalEncodingApi::class)
        internal fun resolveAccessTokenExpiry(
            accessToken: String,
            expiresIn: Int?,
        ): Long? {
            if (expiresIn != null && expiresIn > 0) {
                return currentEpochSeconds() + expiresIn.toLong()
            }
            val payload = accessToken.split('.').getOrNull(1) ?: return null
            val padded = payload
                .replace('-', '+')
                .replace('_', '/')
                .let {
                    val padLen = (4 - (it.length % 4)) % 4
                    it + "=".repeat(padLen)
                }
            val decodedJson = runCatching { Base64.decode(padded).decodeToString() }.getOrNull() ?: return null
            return runCatching {
                Json.parseToJsonElement(decodedJson)
                    .jsonObject["exp"]
                    ?.jsonPrimitive
                    ?.content
                    ?.toLong()
            }.getOrNull()
        }
    }
}
