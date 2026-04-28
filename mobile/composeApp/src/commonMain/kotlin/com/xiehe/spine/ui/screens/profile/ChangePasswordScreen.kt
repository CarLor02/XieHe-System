package com.xiehe.spine.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineAppColors
import com.xiehe.spine.ui.theme.SpineTheme
import kotlinx.coroutines.launch

private enum class PasswordStep {
    VERIFY,
    RESET,
    DONE,
}

private data class PasswordStrength(
    val label: String,
    val score: Int,
)

@Composable
fun ChangePasswordScreen(
    session: UserSession,
    authRepository: AuthRepository,
    onPasswordChanged: suspend () -> Unit,
    onFinished: () -> Unit = {},
    onSessionExpired: (String) -> Unit = {},
) {
    val colors = SpineTheme.colors
    val scope = rememberCoroutineScope()
    var step by remember { mutableStateOf(PasswordStep.VERIFY) }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrent by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    var showConfirm by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scrollState = rememberScrollState()
    val strength = remember(newPassword) { evaluatePasswordStrength(newPassword) }
    val matchesConfirm = confirmPassword.isNotBlank() && confirmPassword == newPassword

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 10.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            PasswordStepCard(step = step)

            when (step) {
                PasswordStep.VERIFY -> {
                    PasswordVerifyCard(
                        currentPassword = currentPassword,
                        showCurrent = showCurrent,
                        submitting = submitting,
                        onPasswordChange = {
                            currentPassword = it
                            errorMessage = null
                        },
                        onToggleVisibility = { showCurrent = !showCurrent },
                        onNext = {
                            if (currentPassword.length < 6) {
                                errorMessage = "请输入正确的当前密码"
                            } else {
                                errorMessage = null
                                scope.launch {
                                    submitting = true
                                    when (
                                        val result = authRepository.verifyCurrentPassword(
                                            username = session.username,
                                            password = currentPassword,
                                        )
                                    ) {
                                        is AppResult.Success -> {
                                            submitting = false
                                            step = PasswordStep.RESET
                                        }

                                        is AppResult.Failure -> {
                                            submitting = false
                                            errorMessage = result.message
                                        }
                                    }
                                }
                            }
                        },
                    )
                    PasswordSafetyTipCard()
                }

                PasswordStep.RESET -> {
                    PasswordResetCard(
                        newPassword = newPassword,
                        confirmPassword = confirmPassword,
                        showNew = showNew,
                        showConfirm = showConfirm,
                        strength = strength,
                        matchesConfirm = matchesConfirm,
                        onNewPasswordChange = {
                            newPassword = it
                            errorMessage = null
                        },
                        onConfirmPasswordChange = {
                            confirmPassword = it
                            errorMessage = null
                        },
                        onToggleNewVisibility = { showNew = !showNew },
                        onToggleConfirmVisibility = { showConfirm = !showConfirm },
                        onBack = {
                            if (!submitting) {
                                errorMessage = null
                                step = PasswordStep.VERIFY
                            }
                        },
                        onConfirm = {
                            when {
                                newPassword.length < 8 -> errorMessage = "密码至少8位"
                                !newPassword.any { it.isUpperCase() } -> errorMessage = "密码必须包含至少一个大写字母"
                                !newPassword.any { it.isDigit() } -> errorMessage = "密码必须包含至少一个数字"
                                newPassword == currentPassword -> errorMessage = "新密码不能与当前密码相同"
                                newPassword != confirmPassword -> errorMessage = "两次密码不一致"
                                else -> {
                                    errorMessage = null
                                    scope.launch {
                                        submitting = true
                                        when (
                                            val result = authRepository.changePassword(
                                                session = session,
                                                currentPassword = currentPassword,
                                                newPassword = newPassword,
                                                confirmPassword = confirmPassword,
                                            )
                                        ) {
                                            is AppResult.Success -> {
                                                submitting = false
                                                onPasswordChanged()
                                            }

                                            is AppResult.Failure -> {
                                                submitting = false
                                                if (result.notifySessionExpired(onSessionExpired)) {
                                                    errorMessage = null
                                                } else {
                                                    errorMessage = result.message
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        confirmEnabled = !submitting,
                    )
                    PasswordSafetyTipCard()
                }

                PasswordStep.DONE -> {
                    PasswordDoneCard(
                        onBackToProfile = onFinished,
                        onReset = {
                            currentPassword = ""
                            newPassword = ""
                            confirmPassword = ""
                            showCurrent = false
                            showNew = false
                            showConfirm = false
                            errorMessage = null
                            step = PasswordStep.VERIFY
                        },
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        if (submitting) {
            LoadingOverlay(message = "...正在提交中")
        }

        errorMessage?.let { message ->
            FloatingToast(
                message = message,
                accentColor = colors.error,
                icon = IconToken.MESSAGE,
                onDismiss = { errorMessage = null },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }
    }
}

@Composable
private fun PasswordStepCard(step: PasswordStep) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(20.dp)
    val shadowColor = colors.textPrimary.copy(alpha = if (colors.isDark) 0.22f else 0.08f)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 620.dp)
            .shadow(12.dp, shape, ambientColor = shadowColor, spotColor = shadowColor)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, shape)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        PasswordStepNode(
            label = "验证身份",
            index = 1,
            state = when (step) {
                PasswordStep.VERIFY -> StepNodeState.ACTIVE
                PasswordStep.RESET, PasswordStep.DONE -> StepNodeState.DONE
            },
            modifier = Modifier.weight(1f),
        )
        PasswordStepConnector(completed = step == PasswordStep.RESET || step == PasswordStep.DONE)
        PasswordStepNode(
            label = "设置新密码",
            index = 2,
            state = when (step) {
                PasswordStep.VERIFY -> StepNodeState.INACTIVE
                PasswordStep.RESET -> StepNodeState.ACTIVE
                PasswordStep.DONE -> StepNodeState.DONE
            },
            modifier = Modifier.weight(1f),
        )
        PasswordStepConnector(completed = step == PasswordStep.DONE)
        PasswordStepNode(
            label = "完成",
            index = 3,
            state = if (step == PasswordStep.DONE) StepNodeState.DONE else StepNodeState.INACTIVE,
            modifier = Modifier.weight(1f),
        )
    }
}

private enum class StepNodeState {
    ACTIVE,
    DONE,
    INACTIVE,
}

@Composable
private fun PasswordStepNode(
    label: String,
    index: Int,
    state: StepNodeState,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val container = when (state) {
        StepNodeState.ACTIVE -> Brush.linearGradient(listOf(colors.primary.copy(alpha = 0.82f), colors.primary))
        StepNodeState.DONE -> Brush.linearGradient(listOf(colors.success.copy(alpha = 0.82f), colors.success))
        StepNodeState.INACTIVE -> Brush.linearGradient(listOf(colors.surfaceMuted, colors.surfaceMuted))
    }
    val textColor = if (state == StepNodeState.INACTIVE) colors.textTertiary else colors.onPrimary
    val labelColor = when (state) {
        StepNodeState.ACTIVE -> colors.primary
        StepNodeState.DONE -> colors.textSecondary
        StepNodeState.INACTIVE -> colors.textTertiary
    }
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(container),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = if (state == StepNodeState.DONE) "✓" else index.toString(),
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = textColor,
            )
        }
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = if (state == StepNodeState.ACTIVE) FontWeight.SemiBold else FontWeight.Medium),
            color = labelColor,
        )
    }
}

@Composable
private fun PasswordStepConnector(completed: Boolean) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .padding(top = 15.dp)
            .width(44.dp)
            .height(2.dp)
            .background(if (completed) colors.success else colors.borderSubtle, RoundedCornerShape(999.dp)),
    )
}

@Composable
private fun PasswordVerifyCard(
    currentPassword: String,
    showCurrent: Boolean,
    submitting: Boolean,
    onPasswordChange: (String) -> Unit,
    onToggleVisibility: () -> Unit,
    onNext: () -> Unit,
) {
    val colors = SpineTheme.colors
    PasswordSurfaceCard {
        PasswordCardTitle(title = "验证当前密码")
        PasswordInputBlock(
            label = "当前密码",
            value = currentPassword,
            placeholder = "请输入当前密码",
            visible = showCurrent,
            onValueChange = onPasswordChange,
            onToggleVisibility = onToggleVisibility,
        )
        Button(
            text = if (submitting) "验证中..." else "下一步",
            onClick = onNext,
            enabled = !submitting,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        )
    }
}

@Composable
private fun PasswordResetCard(
    newPassword: String,
    confirmPassword: String,
    showNew: Boolean,
    showConfirm: Boolean,
    strength: PasswordStrength,
    matchesConfirm: Boolean,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onToggleNewVisibility: () -> Unit,
    onToggleConfirmVisibility: () -> Unit,
    onBack: () -> Unit,
    onConfirm: () -> Unit,
    confirmEnabled: Boolean,
) {
    val colors = SpineTheme.colors
    PasswordSurfaceCard {
        PasswordCardTitle(title = "设置新密码")
        PasswordInputBlock(
            label = "新密码",
            value = newPassword,
            placeholder = "请输入新密码",
            visible = showNew,
            onValueChange = onNewPasswordChange,
            onToggleVisibility = onToggleNewVisibility,
        )
        PasswordStrengthBar(strength = strength)
        PasswordInputBlock(
            label = "确认新密码",
            value = confirmPassword,
            placeholder = "请再次输入新密码",
            visible = showConfirm,
            onValueChange = onConfirmPasswordChange,
            onToggleVisibility = onToggleConfirmVisibility,
        )
        if (matchesConfirm) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.success.copy(alpha = if (colors.isDark) 0.2f else 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "✓",
                        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Bold),
                        color = colors.success,
                    )
                }
                Text(
                    text = "两次密码一致",
                    style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.success,
                )
            }
        }
        PasswordRequirementCard(password = newPassword)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PasswordSecondaryButton(
                text = "上一步",
                onClick = onBack,
                modifier = Modifier.weight(1f),
            )
            Button(
                text = if (confirmEnabled) "确认修改" else "提交中...",
                onClick = onConfirm,
                enabled = confirmEnabled,
                modifier = Modifier.weight(1f).height(52.dp),
            )
        }
    }
}

@Composable
private fun PasswordDoneCard(
    onBackToProfile: () -> Unit,
    onReset: () -> Unit,
) {
    val colors = SpineTheme.colors
    PasswordSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .shadow(18.dp, CircleShape, ambientColor = colors.success.copy(alpha = if (colors.isDark) 0.3f else 0.2f), spotColor = colors.success.copy(alpha = if (colors.isDark) 0.3f else 0.2f))
                    .clip(CircleShape)
                    .background(Brush.linearGradient(listOf(colors.success.copy(alpha = 0.82f), colors.success))),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "✓",
                    style = SpineTheme.typography.display.copy(fontWeight = FontWeight.Bold),
                    color = colors.onPrimary,
                )
            }
            Text(
                text = "密码修改成功",
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
            Text(
                text = "您的密码已更新，请妥善保管新密码",
                style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Medium),
                color = colors.textSecondary,
            )
            Button(
                text = "返回个人中心",
                onClick = onBackToProfile,
                modifier = Modifier.fillMaxWidth().height(52.dp),
            )
            PasswordSecondaryButton(
                text = "再次修改",
                onClick = onReset,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun PasswordSurfaceCard(content: @Composable ColumnScope.() -> Unit) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(24.dp)
    val shadowColor = colors.textPrimary.copy(alpha = if (colors.isDark) 0.22f else 0.08f)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 620.dp)
            .shadow(16.dp, shape, ambientColor = shadowColor, spotColor = shadowColor)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, shape)
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        content = content,
    )
}

@Composable
private fun PasswordCardTitle(title: String) {
    val colors = SpineTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(18.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Brush.linearGradient(listOf(colors.primary.copy(alpha = 0.82f), colors.primary))),
            )
            Text(
                text = title,
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(colors.borderSubtle),
        )
    }
}

@Composable
private fun PasswordInputBlock(
    label: String,
    value: String,
    placeholder: String,
    visible: Boolean,
    onValueChange: (String) -> Unit,
    onToggleVisibility: () -> Unit,
) {
    val colors = SpineTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = label,
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
            color = colors.textSecondary,
        )
        TextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = placeholder,
            modifier = Modifier.fillMaxWidth(),
            password = !visible,
            leadingGlyph = IconToken.LOCK,
            trailingGlyph = if (visible) IconToken.EYE_OFF else IconToken.EYE,
            onTrailingClick = onToggleVisibility,
        )
    }
}

@Composable
private fun PasswordStrengthBar(strength: PasswordStrength) {
    val colors = SpineTheme.colors
    val strengthColor = resolveStrengthColor(strength, colors)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            repeat(4) { index ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (index < strength.score) strengthColor else colors.borderStrong),
                )
            }
        }
        Text(
            text = "密码强度: ${strength.label}",
            style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = strengthColor,
        )
    }
}

@Composable
private fun PasswordRequirementCard(password: String) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.primaryMuted)
            .border(1.dp, colors.primary.copy(alpha = 0.18f), shape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = "密码要求",
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Bold),
            color = colors.primary,
        )
        PasswordRequirementRow(label = "至少8个字符", met = password.length >= 8)
        PasswordRequirementRow(label = "包含大写字母", met = password.any { it.isUpperCase() })
        PasswordRequirementRow(label = "包含数字", met = password.any { it.isDigit() })
        PasswordRequirementRow(label = "包含特殊字符（推荐）", met = password.any { !it.isLetterOrDigit() })
    }
}

@Composable
private fun PasswordRequirementRow(label: String, met: Boolean) {
    val colors = SpineTheme.colors
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (met) {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.success.copy(alpha = if (colors.isDark) 0.2f else 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "✓",
                    style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Bold),
                    color = colors.success,
                )
            }
        } else {
            Text(
                text = "-",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textTertiary,
            )
        }
        Text(
            text = label,
            style = SpineTheme.typography.subhead.copy(fontWeight = if (met) FontWeight.SemiBold else FontWeight.Medium),
            color = if (met) colors.success else colors.textSecondary,
        )
    }
}

@Composable
private fun PasswordSafetyTipCard() {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(24.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 620.dp)
            .clip(shape)
            .background(colors.warning.copy(alpha = if (colors.isDark) 0.18f else 0.1f))
            .border(1.dp, colors.warning.copy(alpha = 0.24f), shape)
            .padding(horizontal = 16.dp, vertical = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(colors.warning.copy(alpha = if (colors.isDark) 0.24f else 0.16f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "!",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.warning,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "安全提示",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.warning,
            )
            Text(
                text = "请勿使用生日、手机号等易猜测的密码，建议定期更换密码以保障账号安全。",
                style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.Medium),
                color = colors.textSecondary,
            )
        }
    }
}

@Composable
private fun PasswordSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = modifier
            .height(52.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surfaceMuted)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = colors.textSecondary,
        )
    }
}

private fun evaluatePasswordStrength(password: String): PasswordStrength {
    val checks = listOf(
        password.length >= 8,
        password.any { it.isUpperCase() },
        password.any { it.isDigit() },
        password.any { !it.isLetterOrDigit() },
    )
    val score = checks.count { it }.coerceAtLeast(if (password.isBlank()) 0 else 1)
    return when {
        score >= 4 -> PasswordStrength(label = "强", score = 4)
        score >= 2 -> PasswordStrength(label = "中", score = 2)
        score >= 1 -> PasswordStrength(label = "弱", score = 1)
        else -> PasswordStrength(label = "弱", score = 0)
    }
}

private fun resolveStrengthColor(
    strength: PasswordStrength,
    colors: SpineAppColors,
): Color = when {
    strength.score >= 4 -> colors.success
    strength.score >= 2 -> colors.warning
    strength.score >= 1 -> colors.error
    else -> colors.borderStrong
}
