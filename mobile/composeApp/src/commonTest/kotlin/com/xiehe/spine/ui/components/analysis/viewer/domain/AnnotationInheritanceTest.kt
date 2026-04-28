package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import kotlin.test.Test
import kotlin.test.assertEquals

class AnnotationInheritanceTest {

    @Test
    fun sacralInheritsReferencePointsFromNewTsMeasurement() {
        val inherited = buildInheritedPointMap(
            toolId = TOOL_SACRAL,
            measurements = listOf(
                measurement(
                    type = "TS",
                    points = listOf(
                        MeasurementPoint(10.0, 20.0),
                        MeasurementPoint(50.0, 20.0),
                        MeasurementPoint(15.0, 60.0),
                        MeasurementPoint(55.0, 60.0),
                    ),
                ),
            ),
        )

        assertEquals(MeasurementPoint(15.0, 60.0), inherited[0])
        assertEquals(MeasurementPoint(55.0, 60.0), inherited[1])
    }

    @Test
    fun sacralInheritsReferencePointsFromNewTtsMeasurement() {
        val inherited = buildInheritedPointMap(
            toolId = TOOL_SACRAL,
            measurements = listOf(
                measurement(
                    type = "TTS",
                    points = listOf(
                        MeasurementPoint(10.0, 20.0),
                        MeasurementPoint(40.0, 20.0),
                        MeasurementPoint(10.0, 50.0),
                        MeasurementPoint(40.0, 50.0),
                        MeasurementPoint(15.0, 90.0),
                        MeasurementPoint(55.0, 90.0),
                    ),
                ),
            ),
        )

        assertEquals(MeasurementPoint(15.0, 90.0), inherited[0])
        assertEquals(MeasurementPoint(55.0, 90.0), inherited[1])
    }

    private fun measurement(
        type: String,
        points: List<MeasurementPoint>,
    ) = AnnotationMeasurement(
        key = "measurement_$type",
        type = type,
        value = "10",
        points = points,
    )
}
