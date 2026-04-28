package com.xiehe.spine

import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import java.util.Calendar

class AndroidPlatform : Platform {
    override val name: String = "Android ${Build.VERSION.SDK_INT}"
}

actual fun getPlatform(): Platform = AndroidPlatform()

actual fun currentHour24(): Int = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)

actual fun currentEpochSeconds(): Long = System.currentTimeMillis() / 1000L

@Composable
actual fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
) {
    BackHandler(enabled = enabled, onBack = onBack)
}
