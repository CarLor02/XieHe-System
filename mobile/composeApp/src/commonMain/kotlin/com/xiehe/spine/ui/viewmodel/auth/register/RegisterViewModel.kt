package com.xiehe.spine.ui.viewmodel.auth

import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.data.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class RegisterViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(RegisterUiState())
    val state: StateFlow<RegisterUiState> = _state.asStateFlow()

    fun updateUsername(value: String) = _state.update { it.copy(username = value, errorMessage = null, successMessage = null) }
    fun updateFullName(value: String) = _state.update { it.copy(fullName = value, errorMessage = null, successMessage = null) }
    fun updateEmail(value: String) = _state.update { it.copy(email = value, errorMessage = null, successMessage = null) }
    fun updatePhone(value: String) = _state.update { it.copy(phone = sanitizePhone(value), errorMessage = null, successMessage = null) }
    fun updatePassword(value: String) = _state.update { it.copy(password = value, errorMessage = null, successMessage = null) }
    fun updateConfirmPassword(value: String) = _state.update { it.copy(confirmPassword = value, errorMessage = null, successMessage = null) }

    fun submit(
        authRepository: AuthRepository,
        onSuccess: () -> Unit,
    ) {
        val current = state.value
        val error = validate(current)
        if (error != null) {
            _state.update { it.copy(errorMessage = error, successMessage = null) }
            return
        }

        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null, successMessage = null) }
            when (
                val result = authRepository.register(
                    username = current.username.trim(),
                    email = current.email.trim(),
                    password = current.password,
                    confirmPassword = current.confirmPassword,
                    fullName = current.fullName.trim(),
                    phone = current.phone.trim().ifBlank { null },
                )
            ) {
                is AppResult.Success -> {
                    _state.update {
                        RegisterUiState(successMessage = "注册成功，请返回登录")
                    }
                    onSuccess()
                }

                is AppResult.Failure -> {
                    _state.update { it.copy(loading = false, errorMessage = result.message) }
                }
            }
        }
    }

    private fun validate(state: RegisterUiState): String? {
        if (state.username.trim().length < 3) {
            return "用户名至少3位"
        }
        if (state.fullName.trim().length < 2) {
            return "姓名至少2位"
        }
        if (!EMAIL_REGEX.matches(state.email.trim())) {
            return "请输入正确的邮箱"
        }
        if (state.password.length < 6) {
            return "密码至少6位"
        }
        if (state.password != state.confirmPassword) {
            return "两次输入的密码不一致"
        }
        if (state.phone.isNotBlank() && state.phone != "+86" && !PHONE_REGEX.matches(state.phone)) {
            return "手机号需为 +86 开头并包含11位手机号"
        }
        return null
    }

    private fun sanitizePhone(raw: String): String {
        val hasPrefix = raw.startsWith("+86")
        val digits = raw.filter { it.isDigit() }
        val body = when {
            hasPrefix -> digits.removePrefix("86")
            raw.startsWith("+") -> digits
            digits.startsWith("86") && digits.length > 11 -> digits.removePrefix("86")
            else -> digits
        }.take(11)
        return "+86$body"
    }

    private companion object {
        val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")
        val PHONE_REGEX = Regex("^\\+86\\d{11}$")
    }
}
