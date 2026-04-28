package com.xiehe.spine.ui.components.feedback.shared

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberUpdatedState
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@Composable
fun PeriodicTaskTrigger(
    intervalMillis: Long,
    enabled: Boolean,
    runImmediately: Boolean = true,
    key: Any? = Unit,
    task: suspend () -> Unit,
) {
    val latestTask = rememberUpdatedState(task)
    LaunchedEffect(key, intervalMillis, enabled, runImmediately) {
        if (!enabled) {
            return@LaunchedEffect
        }
        if (runImmediately) {
            latestTask.value()
        }
        while (isActive) {
            delay(intervalMillis)
            latestTask.value()
        }
    }
}
