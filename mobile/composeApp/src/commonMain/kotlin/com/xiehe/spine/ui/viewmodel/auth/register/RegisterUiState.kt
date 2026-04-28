package com.xiehe.spine.ui.viewmodel.auth

data class RegisterUiState(
    val username: String = "",
    val fullName: String = "",
    val email: String = "",
    val phone: String = "+86",
    val password: String = "",
    val confirmPassword: String = "",
    val loading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
