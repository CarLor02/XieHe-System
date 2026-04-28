package com.xiehe.spine.ui.viewmodel.patient

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.patient.CreatePatientRequest
import com.xiehe.spine.data.patient.PatientRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PatientFormViewModel(
    private val patientIdGenerator: PatientIdGenerator = PatientIdGenerator(),
) : BaseViewModel() {
    private val _state = MutableStateFlow(
        PatientFormUiState(patientId = patientIdGenerator()),
    )
    val state: StateFlow<PatientFormUiState> = _state.asStateFlow()

    fun updateName(value: String) = _state.update { it.copy(name = value) }
    fun updateGender(value: String) = _state.update { it.copy(gender = value) }
    fun updateBirthDate(value: String) = _state.update { it.copy(birthDate = value) }
    fun updatePhonePrefix(value: String) = _state.update { it.copy(phonePrefix = value) }
    fun updatePhoneLocalNumber(value: String) = _state.update { it.copy(phoneLocalNumber = sanitizeLocalPhone(value)) }
    fun updateEmail(value: String) = _state.update { it.copy(email = value) }
    fun updateIdCard(value: String) = _state.update { it.copy(idCard = value) }
    fun updateAddress(value: String) = _state.update { it.copy(address = value) }
    fun updateEmergencyContactName(value: String) = _state.update { it.copy(emergencyContactName = value) }
    fun updateEmergencyContactPhone(value: String) = _state.update { it.copy(emergencyContactPhone = sanitizeEmergencyPhone(value)) }

    fun submit(
        session: UserSession,
        repository: PatientRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSuccess: () -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val form = _state.value
        if (form.name.trim().length < 2) {
            _state.update { it.copy(errorMessage = "患者姓名至少2个字符") }
            return
        }
        if (form.birthDate.isNotBlank() && !isValidBirthDate(form.birthDate)) {
            _state.update { it.copy(errorMessage = "请选择有效的出生日期") }
            return
        }
        if (form.phoneLocalNumber.isNotBlank() && !isValidPhone(form.phonePrefix, form.phoneLocalNumber)) {
            _state.update {
                it.copy(
                    errorMessage = when (form.phonePrefix) {
                        "+86" -> "联系电话需为 +86 开头并包含11位手机号"
                        else -> "联系电话格式不正确"
                    },
                )
            }
            return
        }
        if (form.idCard.isNotBlank() && !ID_CARD_PATTERN.matches(form.idCard.trim())) {
            _state.update { it.copy(errorMessage = "身份证号必须为18位数字或字母") }
            return
        }

        val phone = form.phoneLocalNumber.trim().takeIf { it.isNotBlank() }?.let { form.phonePrefix + it }
        val request = CreatePatientRequest(
            patientId = form.patientId,
            name = form.name.trim(),
            gender = form.gender,
            birthDate = form.birthDate.trim().ifBlank { null },
            phone = phone,
            idCard = form.idCard.trim().ifBlank { null },
            email = form.email.trim().ifBlank { null },
            address = form.address.trim().ifBlank { null },
            emergencyContactName = form.emergencyContactName.trim().ifBlank { null },
            emergencyContactPhone = form.emergencyContactPhone.trim().ifBlank { null },
        )

        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null) }
            when (val result = repository.createPatient(session, request)) {
                is AppResult.Success -> {
                    onSessionUpdated(result.data.first)
                    _state.value = PatientFormUiState(patientId = patientIdGenerator())
                    onSuccess()
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(loading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(loading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    private fun sanitizeLocalPhone(raw: String): String {
        return raw.filter { it.isDigit() }.take(15)
    }

    private fun sanitizeEmergencyPhone(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.startsWith("+")) {
            val prefix = "+" + trimmed.drop(1).takeWhile { it.isDigit() }.take(4)
            val rest = trimmed.drop(1).dropWhile { it.isDigit() }.filter { it.isDigit() }.take(15)
            return prefix + rest
        }
        return "+86" + trimmed.filter { it.isDigit() }.take(11)
    }

    private fun isValidBirthDate(value: String): Boolean {
        return value.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))
    }

    private fun isValidPhone(prefix: String, localNumber: String): Boolean {
        return if (prefix == "+86") {
            localNumber.length == 11 && localNumber.all { it.isDigit() }
        } else {
            localNumber.length in 6..15 && localNumber.all { it.isDigit() }
        }
    }

    private companion object {
        val ID_CARD_PATTERN = Regex("^[0-9A-Za-z]{18}$")
    }
}
