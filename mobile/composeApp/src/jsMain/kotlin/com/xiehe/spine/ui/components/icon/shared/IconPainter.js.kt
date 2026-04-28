package com.xiehe.spine.ui.components.icon.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.painter.Painter
import org.jetbrains.compose.resources.painterResource

@Composable
actual fun platformIconPainter(glyph: IconToken): Painter {
    return painterResource(glyph.composeDrawable())
}
