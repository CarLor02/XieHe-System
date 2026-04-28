package com.xiehe.spine.ui.viewmodel.patient

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.patient.PatientDetail
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.data.patient.UpdatePatientRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PatientEditViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(PatientEditUiState())
    val state: StateFlow<PatientEditUiState> = _state.asStateFlow()

    private var activePatientId: Int? = null
    private var baseline: PatientEditSnapshot? = null

    fun load(
        patientId: Int,
        session: UserSession,
        repository: PatientRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null, successMessage = null) }
            when (val result = repository.loadPatientDetail(session, patientId)) {
                is AppResult.Success -> {
                    onSessionUpdated(result.data.first)
                    val mapped = mapDetailToState(result.data.second)
                    activePatientId = patientId
                    baseline = mapped.toSnapshot()
                    _state.value = mapped.copy(loading = false)
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

    fun updateName(value: String) = updateField { it.copy(name = value) }
    fun updateGender(value: String) = updateField { it.copy(gender = value) }
    fun updateBirthDate(value: String) = updateField { it.copy(birthDate = value) }
    fun updatePhonePrefix(value: String) = updateField { it.copy(phonePrefix = value) }
    fun updatePhoneLocalNumber(value: String) = updateField { it.copy(phoneLocalNumber = value.filter { c -> c.isDigit() }.take(15)) }
    fun updateEmail(value: String) = updateField { it.copy(email = value) }
    fun updateIdCard(value: String) = updateField { it.copy(idCard = value) }
    fun updateAddress(value: String) = updateField { it.copy(address = value) }
    fun updateEmergencyContactName(value: String) = updateField { it.copy(emergencyContactName = value) }
    fun updateEmergencyContactPhone(value: String) = updateField { it.copy(emergencyContactPhone = sanitizeEmergencyPhone(value)) }

    fun submit(
        session: UserSession,
        repository: PatientRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSuccess: () -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val patientId = activePatientId ?: return
        val current = _state.value
        val original = baseline ?: return

        if (current.name.trim().length < 2) {
            _state.update { it.copy(errorMessage = "患者姓名至少2个字符", successMessage = null) }
            return
        }
        if (current.birthDate.isNotBlank() && !DATE_PATTERN.matches(current.birthDate.trim())) {
            _state.update { it.copy(errorMessage = "请选择有效的出生日期", successMessage = null) }
            return
        }
        if (current.phoneLocalNumber.isNotBlank() && !isValidPhone(current.phonePrefix, current.phoneLocalNumber)) {
            _state.update {
                it.copy(
                    errorMessage = if (current.phonePrefix == "+86") "联系电话需为 +86 开头并包含11位手机号" else "联系电话格式不正确",
                    successMessage = null,
                )
            }
            return
        }
        if (current.idCard.isNotBlank() && !ID_CARD_PATTERN.matches(current.idCard.trim())) {
            _state.update { it.copy(errorMessage = "身份证号必须为18位数字或字母", successMessage = null) }
            return
        }

        val now = current.toSnapshot()
        val request = UpdatePatientRequest(
            name = changedValue(now.name, original.name),
            gender = changedValue(now.gender, original.gender),
            birthDate = changedValue(now.birthDate, original.birthDate),
            phone = changedValue(now.phone, original.phone),
            email = changedValue(now.email, original.email),
            idCard = changedValue(now.idCard, original.idCard),
            address = changedValue(now.address, original.address),
            emergencyContactName = changedValue(now.emergencyContactName, original.emergencyContactName),
            emergencyContactPhone = changedValue(now.emergencyContactPhone, original.emergencyContactPhone),
        )
        if (request.isEmpty()) {
            _state.update { it.copy(successMessage = "未检测到修改", errorMessage = null) }
            onSuccess()
            return
        }

        scope.launch {
            _state.update { it.copy(submitting = true, errorMessage = null, successMessage = null) }
            when (val result = repository.updatePatient(session, patientId, request)) {
                is AppResult.Success -> {
                    onSessionUpdated(result.data.first)
                    val mapped = mapDetailToState(result.data.second)
                    baseline = mapped.toSnapshot()
                    _state.value = mapped.copy(loading = false, submitting = false, successMessage = "患者信息已更新")
                    onSuccess()
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(submitting = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(submitting = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    private fun updateField(transform: (PatientEditUiState) -> PatientEditUiState) {
        _state.update {
            transform(it).copy(errorMessage = null, successMessage = null)
        }
    }

    private fun mapDetailToState(detail: PatientDetail): PatientEditUiState {
        val (phonePrefix, phoneLocalNumber) = splitPhone(detail.phone)
        return PatientEditUiState(
            name = detail.name,
            gender = normalizeGender(detail.gender),
            birthDate = detail.birthDate.orEmpty(),
            phonePrefix = phonePrefix,
            phoneLocalNumber = phoneLocalNumber,
            email = detail.email.orEmpty(),
            idCard = detail.idCard.orEmpty(),
            address = detail.address.orEmpty(),
            emergencyContactName = detail.emergencyContactName.orEmpty(),
            emergencyContactPhone = detail.emergencyContactPhone.orEmpty(),
        )
    }

    private fun splitPhone(raw: String?): Pair<String, String> {
        val phone = raw?.trim().orEmpty()
        if (phone.isBlank()) {
            return "+86" to ""
        }
        if (phone.startsWith("+")) {
            val known = PHONE_PREFIX_OPTIONS.firstOrNull { phone.startsWith(it) }
            if (known != null) {
                return known to phone.removePrefix(known).filter { it.isDigit() }.take(15)
            }
            val generic = "+" + phone.drop(1).takeWhile { it.isDigit() }.take(4)
            return generic to phone.removePrefix(generic).filter { it.isDigit() }.take(15)
        }
        val digits = phone.filter { it.isDigit() }
        return if (digits.length == 13 && digits.startsWith("86")) {
            "+86" to digits.drop(2).take(11)
        } else {
            "+86" to digits.take(15)
        }
    }

    private fun sanitizeEmergencyPhone(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) {
            return ""
        }
        return if (trimmed.startsWith("+")) {
            "+" + trimmed.drop(1).filter { it.isDigit() }.take(18)
        } else {
            trimmed.filter { it.isDigit() }.take(18)
        }
    }

    private fun isValidPhone(prefix: String, local: String): Boolean {
        return if (prefix == "+86") {
            local.length == 11 && local.all { it.isDigit() }
        } else {
            local.length in 6..15 && local.all { it.isDigit() }
        }
    }

    private fun normalizeGender(raw: String): String {
        return when (raw.lowercase()) {
            "男", "male" -> "male"
            "女", "female" -> "female"
            else -> "male"
        }
    }

    private fun changedValue(newValue: String?, oldValue: String?): String? {
        return if (newValue == oldValue) null else newValue
    }

    private fun PatientEditUiState.toSnapshot(): PatientEditSnapshot {
        val local = phoneLocalNumber.trim()
        return PatientEditSnapshot(
            name = name.trim(),
            gender = gender.trim(),
            birthDate = birthDate.trim().ifBlank { null },
            phone = if (local.isBlank()) null else phonePrefix + local,
            email = email.trim().ifBlank { null },
            idCard = idCard.trim().ifBlank { null },
            address = address.trim().ifBlank { null },
            emergencyContactName = emergencyContactName.trim().ifBlank { null },
            emergencyContactPhone = emergencyContactPhone.trim().ifBlank { null },
        )
    }

    private fun UpdatePatientRequest.isEmpty(): Boolean {
        return name == null &&
            gender == null &&
            birthDate == null &&
            phone == null &&
            email == null &&
            idCard == null &&
            address == null &&
            emergencyContactName == null &&
            emergencyContactPhone == null &&
            insuranceNumber == null
    }

    private data class PatientEditSnapshot(
        val name: String,
        val gender: String,
        val birthDate: String?,
        val phone: String?,
        val email: String?,
        val idCard: String?,
        val address: String?,
        val emergencyContactName: String?,
        val emergencyContactPhone: String?,
    )

    private companion object {
        val PHONE_PREFIX_OPTIONS = setOf("+86", "+852", "+853", "+886")
        val DATE_PATTERN = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        val ID_CARD_PATTERN = Regex("^[0-9A-Za-z]{18}$")
    }
}
