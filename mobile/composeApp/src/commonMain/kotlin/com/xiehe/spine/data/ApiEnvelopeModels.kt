package com.xiehe.spine.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiEnvelope<T>(
    val code: Int,
    val message: String,
    val data: T? = null,
    val timestamp: String? = null,
)

@Serializable
data class ApiMessageResponse(
    val message: String,
)

@Serializable
data class ApiErrorEnvelope(
    val code: Int? = null,
    val message: String,
    @SerialName("error_code") val errorCode: String? = null,
    val path: String? = null,
    val timestamp: String? = null,
)
