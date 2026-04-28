package com.xiehe.spine

import androidx.compose.runtime.Composable

class WasmPlatform : Platform {
    override val name: String = "Web with Kotlin/Wasm"
}

actual fun getPlatform(): Platform = WasmPlatform()

actual fun currentHour24(): Int = js("new Date().getHours()") as Int

actual fun currentEpochSeconds(): Long = (js("Date.now()") as Double / 1000.0).toLong()

@Composable
actual fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
) {
}
