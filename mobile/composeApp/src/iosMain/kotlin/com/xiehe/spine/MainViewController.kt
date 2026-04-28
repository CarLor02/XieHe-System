package com.xiehe.spine

import androidx.compose.ui.window.ComposeUIViewController

fun MainViewController() = ComposeUIViewController {
    App(container = createIosAppContainer())
}
