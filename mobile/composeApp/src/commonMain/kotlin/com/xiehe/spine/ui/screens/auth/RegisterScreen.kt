package com.xiehe.spine.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.auth.RegisterViewModel

@Composable
fun RegisterScreen(
    vm: RegisterViewModel,
    authRepository: AuthRepository,
    onBackToLogin: () -> Unit,
) {
    val state by vm.state.collectAsState()
    val colors = SpineTheme.colors
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmVisible by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(colors.primaryMuted, colors.background),
                ),
            )
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 500.dp)
                .align(Alignment.Center)
                .padding(horizontal = 22.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = "返回登录",
                    style = SpineTheme.typography.subhead.copy(
                        color = colors.primary,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    modifier = Modifier
                        .background(colors.surface, RoundedCornerShape(SpineTheme.radius.full))
                        .clickable(onClick = onBackToLogin)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
                Text(text = "账号注册", style = SpineTheme.typography.title)
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(
                        value = state.username,
                        onValueChange = vm::updateUsername,
                        placeholder = "用户名(至少3位)",
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.PROFILE,
                    )
                    TextField(
                        value = state.fullName,
                        onValueChange = vm::updateFullName,
                        placeholder = "姓名(至少2位)",
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.PROFILE,
                    )
                    TextField(
                        value = state.email,
                        onValueChange = vm::updateEmail,
                        placeholder = "邮箱",
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.MESSAGE,
                    )
                    TextField(
                        value = state.phone,
                        onValueChange = vm::updatePhone,
                        placeholder = "手机号(可选,+86开头)",
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.MESSAGE,
                    )
                    TextField(
                        value = state.password,
                        onValueChange = vm::updatePassword,
                        placeholder = "密码(至少6位)",
                        password = !passwordVisible,
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.LOCK,
                        trailingGlyph = if (passwordVisible) IconToken.EYE_OFF else IconToken.EYE,
                        onTrailingClick = { passwordVisible = !passwordVisible },
                    )
                    TextField(
                        value = state.confirmPassword,
                        onValueChange = vm::updateConfirmPassword,
                        placeholder = "确认密码",
                        password = !confirmVisible,
                        modifier = Modifier.fillMaxWidth(),
                        leadingGlyph = IconToken.LOCK,
                        trailingGlyph = if (confirmVisible) IconToken.EYE_OFF else IconToken.EYE,
                        onTrailingClick = { confirmVisible = !confirmVisible },
                    )
                }

                AnimatedVisibility(
                    visible = state.errorMessage != null,
                    enter = fadeIn() + slideInVertically { -it / 3 },
                    exit = fadeOut() + slideOutVertically { -it / 3 },
                ) {
                    Text(
                        text = state.errorMessage ?: "",
                        style = SpineTheme.typography.subhead.copy(color = colors.error),
                    )
                }

                state.successMessage?.let {
                    Text(
                        text = it,
                        style = SpineTheme.typography.subhead.copy(color = colors.success),
                    )
                }

                Button(
                    text = if (state.loading) "注册中..." else "立即注册",
                    onClick = {
                        vm.submit(
                            authRepository = authRepository,
                            onSuccess = onBackToLogin,
                        )
                    },
                    enabled = !state.loading,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        if (state.loading) {
            LoadingOverlay(message = "...正在加载中")
        }
    }
}
