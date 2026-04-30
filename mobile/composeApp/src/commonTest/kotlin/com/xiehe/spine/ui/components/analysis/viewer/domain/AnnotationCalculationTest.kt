package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import kotlin.test.Test
import kotlin.test.assertEquals

class AnnotationCalculationTest {

    @Test
    fun manualTsMeasurement_usesWebAlignedTypeAndDescription() {
        val measurement = createManualAnnotationMeasurement(
            toolId = TOOL_TS,
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

        assertEquals(TOOL_TS, measurement?.type)
        assertEquals("胸廓躯干偏移TTS(Thoracic Trunk Shift)", measurement?.description)
    }

    @Test
    fun manualC7OffsetMeasurement_usesWebAlignedTypeAndDescription() {
        val measurement = createManualAnnotationMeasurement(
            toolId = TOOL_C7_OFFSET,
            points = listOf(
                MeasurementPoint(10.0, 20.0),
                MeasurementPoint(40.0, 20.0),
                MeasurementPoint(10.0, 50.0),
                MeasurementPoint(40.0, 50.0),
                MeasurementPoint(15.0, 90.0),
                MeasurementPoint(55.0, 90.0),
            ),
            measurementKey = "c7-offset",
            calibration = emptyCalibration(),
            standardDistanceMm = null,
        )

        assertEquals(TOOL_C7_OFFSET, measurement?.type)
        assertEquals("躯干偏移TS(Trunk Shift)", measurement?.description)
    }

    private fun emptyCalibration() = AnnotationCalibrationContext(
        standardDistanceMm = null,
        standardDistancePoints = emptyList(),
    )
}
