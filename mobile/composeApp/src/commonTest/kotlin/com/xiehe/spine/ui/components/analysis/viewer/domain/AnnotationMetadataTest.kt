package com.xiehe.spine.ui.components.analysis.viewer.domain

import androidx.compose.ui.geometry.Offset
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import kotlin.test.Test
import kotlin.test.assertEquals

class AnnotationMetadataTest {

    @Test
    fun ssTagAnchor_usesRightTopPosition() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = "SS",
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
            measurement = measurement(type = "PI", points = points),
            sx = 1f,
            sy = 1f,
            imageScale = 2f,
        )
        val ptAnchor = resolveMeasurementTagAnchor(
            measurement = measurement(type = "PT", points = points),
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
                type = "TS",
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
                type = "TTS",
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
        assertEquals(AnnotationRenderType.TTS, resolveAnnotationRenderType(type = "TS", pointsCount = 4))
        assertEquals(AnnotationRenderType.TTS, resolveAnnotationRenderType(type = "TTS", pointsCount = 4))
        assertEquals(AnnotationRenderType.C7_OFFSET, resolveAnnotationRenderType(type = "TTS", pointsCount = 6))
        assertEquals(AnnotationRenderType.C7_OFFSET, resolveAnnotationRenderType(type = "TS(Trunk Shift)", pointsCount = 6))
    }

    @Test
    fun tkT2T5TagAnchor_matchesWebCatalogPosition() {
        val anchor = resolveMeasurementTagAnchor(
            measurement = measurement(
                type = "TK T2-T5",
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

    private fun measurement(
        type: String,
        points: List<MeasurementPoint>,
    ) = AnnotationMeasurement(
        key = "test_$type",
        type = type,
        value = "10°",
        points = points,
    )
}
