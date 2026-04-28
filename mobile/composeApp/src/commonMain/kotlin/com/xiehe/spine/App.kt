package com.xiehe.spine

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.tooling.preview.Preview
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun App(
    container: AppContainer,
    showNetworkDiagnostics: Boolean = false,
) {
    val themePreference by container.themeRepository.preference.collectAsState()
    SpineTheme(preference = themePreference) {
        AppSessionCoordinator(
            container = container,
            showNetworkDiagnostics = showNetworkDiagnostics,
        )
    }
}

@Composable
fun DemoApp(
    showNetworkDiagnostics: Boolean = false,
) {
    val container = remember(showNetworkDiagnostics) {
        AppContainer.createInMemory(enableNetworkDiagnostics = showNetworkDiagnostics)
    }
    App(
        container = container,
        showNetworkDiagnostics = showNetworkDiagnostics,
    )
}

@Preview
@Composable
private fun PreviewApp() {
    DemoApp()
}
