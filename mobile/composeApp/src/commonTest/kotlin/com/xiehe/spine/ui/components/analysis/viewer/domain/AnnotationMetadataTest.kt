package com.xiehe.spine.ui.components.analysis.viewer.domain

import androidx.compose.ui.geometry.Offset
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T2_T5
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TTS
import kotlin.test.Test
import kotlin.test.assertEquals

class AnnotationMetadataTest {

    @Test
    fun ssTagAnchor_usesRightTopPosition() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = TOOL_SS,
                points = listOf(
                    MeasurementPoint(10.0, 20.0),
                    MeasurementPoint(30.0, 40.0),
                ),
            ),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )

        assertEquals(55f, anchor.x)
        assertEquals(20f, anchor.y)
    }

    @Test
    fun piAndPtTagAnchors_splitToUpperAndLowerRight() {
        val points = listOf(
            MeasurementPoint(20.0, 80.0),
            MeasurementPoint(60.0, 40.0),
            MeasurementPoint(100.0, 60.0),
        )

        val piAnchor = resolveMeasurementTagAnchor(
            measurement = measurement(type = TOOL_PI, points = points),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )
        val ptAnchor = resolveMeasurementTagAnchor(
            measurement = measurement(type = TOOL_PT, points = points),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )

        assertEquals(125f, piAnchor.x)
        assertEquals(30f, piAnchor.y)
        assertEquals(125f, ptAnchor.x)
        assertEquals(100f, ptAnchor.y)
    }

    @Test
    fun tsTagAnchor_movesToRightOfGuideLines() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = TOOL_TTS,
                points = listOf(
                    MeasurementPoint(10.0, 30.0),
                    MeasurementPoint(50.0, 30.0),
                    MeasurementPoint(20.0, 80.0),
                    MeasurementPoint(60.0, 80.0),
                ),
            ),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )

        assertEquals(85f, anchor.x)
        assertEquals(10f, anchor.y)
    }

    @Test
    fun ttsTagAnchor_usesC7OffsetGuideLinePosition() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = TOOL_TS,
                points = listOf(
                    MeasurementPoint(10.0, 30.0),
                    MeasurementPoint(50.0, 30.0),
                    MeasurementPoint(20.0, 60.0),
                    MeasurementPoint(60.0, 60.0),
                    MeasurementPoint(25.0, 100.0),
                    MeasurementPoint(70.0, 100.0),
                ),
            ),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )

        assertEquals(95f, anchor.x)
        assertEquals(25f, anchor.y)
    }

    @Test
    fun renderType_usesPointCountToDisambiguateTtsAndC7Offset() {
        assertEquals(AnnotationRenderType.TTS, resolveAnnotationRenderType(type = TOOL_TTS, pointsCount = 4))
        assertEquals(AnnotationRenderType.TS, resolveAnnotationRenderType(type = TOOL_TS, pointsCount = 6))
    }

    @Test
    fun tkT2T5TagAnchor_matchesWebCatalogPosition() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = TOOL_TK_T2_T5,
                points = listOf(
                    MeasurementPoint(10.0, 50.0),
                    MeasurementPoint(30.0, 60.0),
                    MeasurementPoint(40.0, 110.0),
                    MeasurementPoint(60.0, 100.0),
                ),
            ),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )

        assertEquals(35f, anchor.x)
        assertEquals(30f, anchor.y)
    }

    @Test
    fun smartTagPosition_usesScaleAwareOffsets() {
        val adjusted = calculateSmartTagPosition(
            basePosition = Offset(100f, 100f),
            occupiedPositions = listOf(Offset(100f, 100f)),
            imageScale = 2f,
        )

        assertEquals(100f, adjusted.x)
        assertEquals(50f, adjusted.y)
    }

    @Test
    fun auxiliaryLengthShowsMeasurementValueTagWithDefaultName() {
        val measurement = measurement(
            type = TOOL_AUX_LENGTH,
            points = listOf(
                MeasurementPoint(10.0, 20.0),
                MeasurementPoint(70.0, 20.0),
            ),
            value = "12.34mm",
            description = "辅助距离测量",
            auxiliary = true,
        )

        assertEquals(true, shouldShowMetricTag(measurement))
        assertEquals(false, shouldShowAuxiliaryShapeTag(measurement))
        assertEquals("距离标注: 12mm", formatMeasurementTag(measurement))
    }

    @Test
    fun auxiliaryLengthMeasurementValueTagUsesCustomName() {
        val measurement = measurement(
            type = TOOL_AUX_LENGTH,
            points = listOf(
                MeasurementPoint(10.0, 20.0),
                MeasurementPoint(70.0, 20.0),
            ),
            value = "12.34mm",
            description = "术前距离",
            auxiliary = true,
        )

        assertEquals("术前距离: 12mm", formatMeasurementTag(measurement))
    }

    private fun measurement(
        type: String,
        points: List<MeasurementPoint>,
        value: String = "10°",
        description: String? = null,
        auxiliary: Boolean = false,
    ) = AnnotationMeasurement(
        key = "test_$type",
        type = type,
        value = value,
        points = points,
        description = description,
        auxiliary = auxiliary,
    )
}
