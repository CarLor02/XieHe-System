package com.xiehe.spine

import androidx.compose.runtime.Composable

class JsPlatform : Platform {
    override val name: String = "Web with Kotlin/JS"
}

actual fun getPlatform(): Platform = JsPlatform()

actual fun currentHour24(): Int = js("new Date().getHours()") as Int

actual fun currentEpochSeconds(): Long = (js("Date.now()") as Double / 1000.0).toLong()

@Composable
actual fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
) {
}
