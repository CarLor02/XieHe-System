package com.xiehe.spine.data

import kotlinx.serialization.Serializable

@Serializable
data class HealthData(
    val status: String? = null,
    val timestamp: String? = null,
    val version: String? = null,
    val environment: String? = null,
)
