package com.xiehe.spine

import android.content.Context
import com.xiehe.spine.core.store.KeyValueStore
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.data.cache.AndroidImageBinaryStore

private class AndroidKeyValueStore(context: Context) : KeyValueStore {
    private val prefs = context.getSharedPreferences("spine_prefs", Context.MODE_PRIVATE)

    override fun getString(key: String): String? = prefs.getString(key, null)

    override fun putString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    override fun remove(key: String) {
        prefs.edit().remove(key).apply()
    }
}

fun createAndroidAppContainer(
    context: Context,
    baseUrl: String,
    enableNetworkDiagnostics: Boolean,
): AppContainer {
    return AppContainer.create(
        store = AndroidKeyValueStore(context.applicationContext),
        baseUrl = baseUrl,
        enableNetworkDiagnostics = enableNetworkDiagnostics,
        imageBinaryStore = AndroidImageBinaryStore(context.applicationContext),
    )
}
