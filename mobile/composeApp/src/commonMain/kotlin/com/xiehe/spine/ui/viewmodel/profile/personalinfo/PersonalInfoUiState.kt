package com.xiehe.spine.ui.viewmodel.profile

data class PersonalInfoUiState(
    val loading: Boolean = false,
    val saving: Boolean = false,
    val loaded: Boolean = false,
    val username: String = "",
    val email: String = "",
    val realName: String = "",
    val phone: String = "",
    val position: String = "",
    val title: String = "",
    val role: String = "",
    val department: String = "",
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
