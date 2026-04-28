package com.xiehe.spine.data.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
    @SerialName("remember_me") val rememberMe: Boolean,
)

@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    @SerialName("confirm_password") val confirmPassword: String,
    @SerialName("full_name") val fullName: String,
    val phone: String? = null,
)

@Serializable
data class RefreshRequest(
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class PasswordResetRequest(
    val email: String,
)

@Serializable
data class PasswordResetConfirmRequest(
    val token: String,
    @SerialName("new_password") val newPassword: String,
    @SerialName("confirm_password") val confirmPassword: String,
)

@Serializable
data class PasswordChangeRequest(
    @SerialName("current_password") val currentPassword: String,
    @SerialName("new_password") val newPassword: String,
    @SerialName("confirm_password") val confirmPassword: String,
)

@Serializable
data class TokenPayload(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("token_type") val tokenType: String,
    @SerialName("expires_in") val expiresIn: Int? = null,
)

@Serializable
data class LoginData(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("token_type") val tokenType: String,
    @SerialName("expires_in") val expiresIn: Int,
    val user: UserDto,
)

@Serializable
data class RefreshData(
    val tokens: TokenPayload,
)

@Serializable
data class RegisterData(
    val user: UserDto,
)

@Serializable
data class UserDto(
    val id: Int,
    val username: String,
    val email: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("avatar") val avatar: String? = null,
    @SerialName("is_superuser") val isSuperuser: Boolean = false,
    @SerialName("is_system_admin") val isSystemAdmin: Boolean = false,
)

@Serializable
data class CurrentUserProfile(
    val id: Int,
    val username: String,
    val email: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val phone: String? = null,
    @SerialName("real_name") val realName: String? = null,
    @SerialName("employee_id") val employeeId: String? = null,
    val department: String? = null,
    @SerialName("department_id") val departmentId: Int? = null,
    val position: String? = null,
    val title: String? = null,
    @SerialName("is_active") val isActive: Boolean? = null,
    val role: String? = null,
    @SerialName("is_superuser") val isSuperuser: Boolean = false,
    @SerialName("is_system_admin") val isSystemAdmin: Boolean = false,
)

@Serializable
data class UpdateCurrentUserRequest(
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("real_name") val realName: String? = null,
    val phone: String? = null,
    @SerialName("department_id") val departmentId: Int? = null,
    val position: String? = null,
    val title: String? = null,
)
