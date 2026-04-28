package com.xiehe.spine

import androidx.compose.runtime.Composable
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.ui.screens.auth.LoginScreen
import com.xiehe.spine.ui.screens.auth.RegisterScreen
import com.xiehe.spine.ui.viewmodel.auth.LoginViewModel
import com.xiehe.spine.ui.viewmodel.auth.RegisterViewModel

@Composable
internal fun AuthHost(
    authRoute: AuthRoute,
    loginVm: LoginViewModel,
    registerVm: RegisterViewModel,
    authRepository: AuthRepository,
    showNetworkDiagnostics: Boolean,
    onAuthRouteChange: (AuthRoute) -> Unit,
    onLogin: (session: com.xiehe.spine.core.store.UserSession) -> Unit,
) {
    PlatformBackHandler(enabled = authRoute == AuthRoute.REGISTER) {
        onAuthRouteChange(AuthRoute.LOGIN)
    }

    when (authRoute) {
        AuthRoute.LOGIN -> LoginScreen(
            vm = loginVm,
            onLogin = { loginVm.submit(authRepository, onSuccess = onLogin) },
            onHealthCheck = { loginVm.checkConnectivity(authRepository) },
            showNetworkDiagnostics = showNetworkDiagnostics,
            onOpenRegister = { onAuthRouteChange(AuthRoute.REGISTER) },
        )

        AuthRoute.REGISTER -> RegisterScreen(
            vm = registerVm,
            authRepository = authRepository,
            onBackToLogin = { onAuthRouteChange(AuthRoute.LOGIN) },
        )
    }
}
