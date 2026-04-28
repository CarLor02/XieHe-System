package com.xiehe.spine

import com.xiehe.spine.core.model.AppResult

internal const val DEFAULT_SESSION_EXPIRED_MESSAGE = "登录已过期，请重新登录"

internal sealed interface SessionEvent {
    data class SessionExpired(
        val message: String = DEFAULT_SESSION_EXPIRED_MESSAGE,
    ) : SessionEvent
}

internal fun sessionExpiredMessage(message: String?): String {
    return message?.trim()?.takeIf { it.isNotEmpty() } ?: DEFAULT_SESSION_EXPIRED_MESSAGE
}

internal fun AppResult.Failure.notifySessionExpired(
    onSessionExpired: (String) -> Unit,
): Boolean {
    if (!isUnauthorized) {
        return false
    }
    onSessionExpired(sessionExpiredMessage(message))
    return true
}

internal fun AppResult.Failure.asSessionExpiredEvent(): SessionEvent.SessionExpired {
    return SessionEvent.SessionExpired(sessionExpiredMessage(message))
}
