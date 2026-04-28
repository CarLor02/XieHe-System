package com.xiehe.spine.ui.components.analysis.viewer.components.annotationcanvas.layers

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale

@Composable
fun ImageLayer(
    bitmap: ImageBitmap,
    colorFilter: ColorFilter?,
    modifier: Modifier = Modifier,
) {
    Image(
        bitmap = bitmap,
        contentDescription = "analysis_image",
        modifier = modifier.fillMaxSize(),
        contentScale = ContentScale.FillBounds,
        colorFilter = colorFilter,
    )
}
