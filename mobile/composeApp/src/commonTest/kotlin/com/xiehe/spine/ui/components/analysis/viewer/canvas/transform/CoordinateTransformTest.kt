package com.xiehe.spine.ui.components.analysis.viewer.canvas.transform

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.Density
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class CoordinateTransformTest {

    @Test
    fun computeFitSize_usesContainScaleAcrossWidthAndHeight() {
        val fitSize = computeFitSize(
            bitmapWidth = 100,
            bitmapHeight = 200,
            maxWidth = 300,
            maxHeight = 300,
            density = Density(1f),
        )

        assertEquals(150f, fitSize.width.value)
        assertEquals(300f, fitSize.height.value)
    }

    @Test
    fun screenToImagePoint_mapsScaledCenterBackToImageCenter() {
        val mapped = screenToImagePoint(
            tapOffset = Offset(150f, 150f),
            imageWidth = 100,
            imageHeight = 200,
            containerWidthPx = 300f,
            containerHeightPx = 300f,
            panOffset = Offset.Zero,
            totalScale = 2f,
            baseImageWidthPx = 150f,
            baseImageHeightPx = 300f,
        )

        assertNotNull(mapped)
        assertEquals(50.0, mapped.x)
        assertEquals(100.0, mapped.y)
    }
}
