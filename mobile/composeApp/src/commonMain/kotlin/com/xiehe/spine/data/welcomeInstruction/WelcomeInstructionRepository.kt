package com.xiehe.spine.data.welcomeInstruction

import com.xiehe.spine.core.store.KeyValueStore

class WelcomeInstructionRepository(
    private val store: KeyValueStore,
) {
    private val completedKey = "welcome_instruction.completed.v1"

    fun shouldShow(): Boolean = store.getString(completedKey) != "1"

    fun markCompleted() {
        store.putString(completedKey, "1")
    }
}
