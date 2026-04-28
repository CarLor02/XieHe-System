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
            measurementKey = "ts",
            calibration = emptyCalibration(),
            standardDistanceMm = null,
        )

        assertEquals("TS", measurement?.type)
        assertEquals("躯干偏移量TS(Trunk Shift)", measurement?.description)
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
            measurementKey = "tts",
            calibration = emptyCalibration(),
            standardDistanceMm = null,
        )

        assertEquals("TTS", measurement?.type)
        assertEquals("C7偏移距离TTS(Trunk Shift)", measurement?.description)
    }

    private fun emptyCalibration() = AnnotationCalibrationContext(
        standardDistanceMm = null,
        standardDistancePoints = emptyList(),
    )
}
