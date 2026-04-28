package com.xiehe.spine.ui.viewmodel.auth

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val rememberMe: Boolean = false,
    val loading: Boolean = false,
    val errorMessage: String? = null,
    val errorDetails: String? = null,
    val healthChecking: Boolean = false,
    val healthStatus: String? = null,
    val healthDetails: String? = null,
)
