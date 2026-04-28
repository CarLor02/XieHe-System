package com.xiehe.spine

import androidx.compose.runtime.Composable
import platform.Foundation.NSDate
import platform.Foundation.NSDateFormatter
import platform.Foundation.timeIntervalSince1970
import platform.UIKit.UIDevice

class IOSPlatform : Platform {
    override val name: String = UIDevice.currentDevice.systemName() + " " + UIDevice.currentDevice.systemVersion
}

actual fun getPlatform(): Platform = IOSPlatform()

actual fun currentHour24(): Int {
    val formatter = NSDateFormatter()
    formatter.dateFormat = "H"
    return formatter.stringFromDate(NSDate()).toIntOrNull() ?: 12
}

actual fun currentEpochSeconds(): Long = NSDate().timeIntervalSince1970.toLong()

@Composable
actual fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
) {
}
