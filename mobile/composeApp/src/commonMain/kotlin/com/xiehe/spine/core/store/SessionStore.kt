package com.xiehe.spine.core.store

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class UserSession(
    val accessToken: String,
    val refreshToken: String,
    val userId: Int,
    val username: String,
    val email: String? = null,
    val fullName: String? = null,
    val avatarUrl: String? = null,
    val avatar: String? = null,
    val isSuperuser: Boolean = false,
    val isSystemAdmin: Boolean = false,
    val accessTokenExpiresAtEpochSeconds: Long? = null,
)

class SessionStore(
    private val store: KeyValueStore,
    private val json: Json,
) {
    private val key = "user_session"

    fun save(session: UserSession) {
        store.putString(key, json.encodeToString(UserSession.serializer(), session))
    }

    fun load(): UserSession? {
        val raw = store.getString(key) ?: return null
        return runCatching { json.decodeFromString(UserSession.serializer(), raw) }.getOrNull()
    }

    fun clear() {
        store.remove(key)
    }
}
