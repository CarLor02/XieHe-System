package com.xiehe.spine.data.notification

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient

class NotificationRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    suspend fun loadMessages(
        session: UserSession,
        page: Int = 1,
        pageSize: Int = 20,
        messageType: String? = null,
        isRead: Boolean? = null,
    ): AppResult<Pair<UserSession, NotificationMessagePageData>> {
        val path = buildString {
            append("/notifications/messages?skip=")
            append(((page - 1).coerceAtLeast(0)) * pageSize)
            append("&limit=")
            append(pageSize)
            messageType?.trim()?.takeIf { it.isNotBlank() }?.let {
                append("&message_type=")
                append(it)
            }
            isRead?.let {
                append("&is_read=")
                append(it)
            }
        }
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(path = path, accessToken = accessToken)
        }
    }

    suspend fun loadStats(
        session: UserSession,
    ): AppResult<Pair<UserSession, NotificationStats>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/notifications/messages/stats",
                accessToken = accessToken,
            )
        }
    }

    suspend fun getSettings(
        session: UserSession,
    ): AppResult<Pair<UserSession, NotificationSettings>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/notifications/settings",
                accessToken = accessToken,
            )
        }
    }

    suspend fun updateSettings(
        session: UserSession,
        request: NotificationSettingsUpdateRequest,
    ): AppResult<Pair<UserSession, NotificationSettings>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.put(
                path = "/notifications/settings",
                body = request,
                accessToken = accessToken,
            )
        }
    }

    suspend fun markMessageRead(
        session: UserSession,
        messageId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.put<MarkMessageReadData, Map<String, String>>(
                path = "/notifications/messages/$messageId/read",
                body = emptyMap(),
                accessToken = accessToken,
            ).let { result ->
                when (result) {
                    is AppResult.Success -> AppResult.Success("消息已标记为已读")
                    is AppResult.Failure -> result
                }
            }
        }
    }

    suspend fun deleteMessage(
        session: UserSession,
        messageId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.deleteForMessage(
                path = "/notifications/messages/$messageId",
                accessToken = accessToken,
            )
        }
    }

    suspend fun sendMessage(
        session: UserSession,
        request: NotificationMessageCreateRequest,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.postForMessage(
                path = "/notifications/messages",
                body = request,
                accessToken = accessToken,
            )
        }
    }
}
