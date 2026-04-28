package com.xiehe.spine.ui.viewmodel.shared

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

open class BaseViewModel {
    private val job = SupervisorJob()
    protected val scope = CoroutineScope(job + Dispatchers.Main)

    open fun dispose() {
        scope.cancel()
    }
}
