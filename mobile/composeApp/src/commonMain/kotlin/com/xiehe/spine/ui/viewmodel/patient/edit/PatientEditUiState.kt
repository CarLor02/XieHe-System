package com.xiehe.spine.ui.viewmodel.patient

data class PatientEditUiState(
    val loading: Boolean = false,
    val submitting: Boolean = false,
    val name: String = "",
    val gender: String = "male",
    val birthDate: String = "",
    val phonePrefix: String = "+86",
    val phoneLocalNumber: String = "",
    val email: String = "",
    val idCard: String = "",
    val address: String = "",
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
