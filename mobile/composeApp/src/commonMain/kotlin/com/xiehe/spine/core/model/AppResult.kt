package com.xiehe.spine.core.model

sealed interface AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>

    data class Failure(
        val message: String,
        val code: Int? = null,
        val isUnauthorized: Boolean = false,
        val debugDetails: String? = null,
    ) : AppResult<Nothing>
}
