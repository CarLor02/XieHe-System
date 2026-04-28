package com.xiehe.spine.data.welcomeInstruction

import com.xiehe.spine.core.store.InMemoryKeyValueStore
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class WelcomeInstructionRepositoryTest {

    @Test
    fun shouldShow_defaultsToTrueUntilCompleted() {
        val repository = WelcomeInstructionRepository(InMemoryKeyValueStore())

        assertTrue(repository.shouldShow())
        repository.markCompleted()
        assertFalse(repository.shouldShow())
    }
}
