package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TTS
import kotlin.test.Test
import kotlin.test.assertEquals

class AnnotationCalculationTest {

    @Test
    fun manualTsMeasurement_usesWebAlignedTypeAndDescription() {
        val measurement = createManualAnnotationMeasurement(
            toolId = TOOL_TTS,
            points = listOf(
                MeasurementPoint(10.0, 20.0),
                MeasurementPoint(50.0, 20.0),
                MeasurementPoint(15.0, 60.0),
                MeasurementPoint(55.0, 60.0),
            ),
            measurementKey = "tts",
            calibration = emptyCalibration(),
            standardDistanceMm = null,
        )

        assertEquals(TOOL_TTS, measurement?.type)
        assertEquals("胸廓躯干偏移TTS(Thoracic Trunk Shift)", measurement?.description)
    }

    @Test
    fun manualC7OffsetMeasurement_usesWebAlignedTypeAndDescription() {
        val measurement = createManualAnnotationMeasurement(
            toolId = TOOL_TS,
            points = listOf(
                MeasurementPoint(10.0, 20.0),
                MeasurementPoint(40.0, 20.0),
                MeasurementPoint(10.0, 50.0),
                MeasurementPoint(40.0, 50.0),
                MeasurementPoint(15.0, 90.0),
                MeasurementPoint(55.0, 90.0),
            ),
            measurementKey = "ts",
            calibration = emptyCalibration(),
            standardDistanceMm = null,
        )

        assertEquals(TOOL_TS, measurement?.type)
        assertEquals("躯干偏移TS(Trunk Shift)", measurement?.description)
    }

    @Test
    fun twoPointAiTsMeasurement_calculatesDistance() {
        val measurement = createManualAnnotationMeasurement(
            toolId = TOOL_TS,
            points = listOf(
                MeasurementPoint(15.0, 90.0),
                MeasurementPoint(55.0, 90.0),
            ),
            measurementKey = "ai_compute_ts",
            calibration = AnnotationCalibrationContext(
                standardDistanceMm = 100.0,
                standardDistancePoints = listOf(
                    MeasurementPoint(0.0, 0.0),
                    MeasurementPoint(100.0, 0.0),
                ),
            ),
            standardDistanceMm = 100.0,
        )

        assertEquals(TOOL_TS, measurement?.type)
        assertEquals("40.00mm", measurement?.value)
        assertEquals("躯干偏移TS(Trunk Shift)", measurement?.description)
    }

    private fun emptyCalibration() = AnnotationCalibrationContext(
        standardDistanceMm = null,
        standardDistancePoints = emptyList(),
    )
}
