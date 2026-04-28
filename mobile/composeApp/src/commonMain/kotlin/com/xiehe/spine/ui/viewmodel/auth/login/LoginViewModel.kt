package com.xiehe.spine.ui.viewmodel.auth

import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun updateUsername(value: String) {
        _state.update { it.copy(username = value, errorMessage = null, errorDetails = null) }
    }

    fun updatePassword(value: String) {
        _state.update { it.copy(password = value, errorMessage = null, errorDetails = null) }
    }

    fun updateRememberMe(value: Boolean) {
        _state.update { it.copy(rememberMe = value, errorMessage = null, errorDetails = null) }
    }

    fun checkConnectivity(authRepository: AuthRepository) {
        scope.launch {
            _state.update { it.copy(healthChecking = true, healthStatus = null, healthDetails = null) }
            when (val result = authRepository.healthCheck()) {
                is AppResult.Success -> {
                    _state.update {
                        it.copy(
                            healthChecking = false,
                            healthStatus = "后端连通: ${result.data.status ?: "ok"}",
                            healthDetails = "version=${result.data.version ?: "-"} env=${result.data.environment ?: "-"}",
                        )
                    }
                }

                is AppResult.Failure -> {
                    _state.update {
                        it.copy(
                            healthChecking = false,
                            healthStatus = "后端不可用: ${result.message}",
                            healthDetails = result.debugDetails ?: "code=${result.code ?: "N/A"}",
                        )
                    }
                }
            }
        }
    }

    fun submit(
        authRepository: AuthRepository,
        onSuccess: (UserSession) -> Unit,
    ) {
        val current = _state.value
        if (current.username.isBlank() || current.password.isBlank()) {
            _state.update { it.copy(errorMessage = "请输入用户名和密码") }
            return
        }
        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null, errorDetails = null) }
            when (
                val result = authRepository.login(
                    username = current.username.trim(),
                    password = current.password,
                    rememberMe = current.rememberMe,
                )
            ) {
                is AppResult.Success -> {
                    _state.update { it.copy(loading = false) }
                    onSuccess(result.data)
                }

                is AppResult.Failure -> {
                    _state.update {
                        it.copy(
                            loading = false,
                            errorMessage = result.message,
                            errorDetails = result.debugDetails ?: "code=${result.code ?: "N/A"}",
                        )
                    }
                }
            }
        }
    }
}
