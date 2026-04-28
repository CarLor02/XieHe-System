package com.xiehe.spine

import com.xiehe.spine.core.store.InMemoryKeyValueStore
import com.xiehe.spine.core.store.SessionStore
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.theme.ThemePreferenceRepository
import com.xiehe.spine.ui.theme.AppThemeBrandColor
import com.xiehe.spine.ui.theme.ThemeMode
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class ComposeAppCommonTest {

    @Test
    fun themePreferenceRepository_updatesAndPersistsValues() {
        val store = InMemoryKeyValueStore()
        val repository = ThemePreferenceRepository(store)

        repository.updateBrand(AppThemeBrandColor.BLUE)
        repository.updateMode(ThemeMode.DARK)

        val reloaded = ThemePreferenceRepository(store)
        assertEquals(AppThemeBrandColor.BLUE, reloaded.preference.value.brand)
        assertEquals(ThemeMode.DARK, reloaded.preference.value.mode)
    }

    @Test
    fun themePreferenceRepository_fallsBackToDefaultForInvalidStoredValue() {
        val store = InMemoryKeyValueStore()
        store.putString("theme_preference", "INVALID|INVALID")

        val repository = ThemePreferenceRepository(store)
        assertEquals(AppThemeBrandColor.GREEN, repository.preference.value.brand)
        assertEquals(ThemeMode.SYSTEM, repository.preference.value.mode)
    }

    @Test
    fun sessionStore_roundTripAndClear() {
        val store = InMemoryKeyValueStore()
        val sessionStore = SessionStore(store, Json { ignoreUnknownKeys = true })
        val source = UserSession(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            userId = 100,
            username = "tester",
            email = "tester@example.com",
            fullName = "Test User",
        )

        sessionStore.save(source)
        val restored = sessionStore.load()

        assertNotNull(restored)
        assertEquals(source, restored)

        sessionStore.clear()
        assertNull(sessionStore.load())
    }

    @Test
    fun sessionStore_returnsNullWhenStoredPayloadIsBroken() {
        val store = InMemoryKeyValueStore()
        store.putString("user_session", "{not-valid-json")
        val sessionStore = SessionStore(store, Json { ignoreUnknownKeys = true })

        assertNull(sessionStore.load())
    }
}
