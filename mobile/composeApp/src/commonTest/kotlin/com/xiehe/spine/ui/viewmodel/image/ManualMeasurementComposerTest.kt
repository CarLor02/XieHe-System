package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class ManualMeasurementComposerTest {

    @Test
    fun piAfterSs_needsOneClick_andAutoCompletesPt() {
        val ssMeasurement = AnnotationMeasurement(
            key = "manual_ss",
            type = "SS",
            value = "32°",
            points = listOf(
                MeasurementPoint(120.0, 240.0),
                MeasurementPoint(260.0, 220.0),
            ),
        )
        val piTool = requireNotNull(getAnnotationTool(TOOL_PI))
        val femoralHeadCenter = MeasurementPoint(180.0, 360.0)
        var keyIndex = 0

        assertEquals(
            1,
            ManualMeasurementComposer.effectiveInteractionPoints(
                tool = piTool,
                measurements = listOf(ssMeasurement),
            ),
        )

        val batch = ManualMeasurementComposer.buildBatch(
            tool = piTool,
            userPoints = listOf(femoralHeadCenter),
            measurements = listOf(ssMeasurement),
            standardDistanceMm = 100.0,
            standardDistancePoints = listOf(
                MeasurementPoint(0.0, 0.0),
                MeasurementPoint(200.0, 0.0),
            ),
            nextMeasurementKey = { toolId ->
                keyIndex += 1
                "manual_${toolId}_$keyIndex"
            },
        )

        assertNotNull(batch)
        assertEquals(listOf("PI", "PT"), batch.addedMeasurements.map { it.type })
        assertEquals(
            listOf(femoralHeadCenter, ssMeasurement.points[0], ssMeasurement.points[1]),
            batch.primaryMeasurement.points,
        )
        assertEquals(
            listOf(femoralHeadCenter, ssMeasurement.points[0], ssMeasurement.points[1]),
            batch.addedMeasurements.last().points,
        )
    }

    @Test
    fun ssAfterSva_reusesInheritedSacralPoint() {
        val svaMeasurement = AnnotationMeasurement(
            key = "manual_sva",
            type = "SVA",
            value = "15mm",
            points = listOf(
                MeasurementPoint(40.0, 100.0),
                MeasurementPoint(42.0, 180.0),
                MeasurementPoint(60.0, 102.0),
                MeasurementPoint(62.0, 182.0),
                MeasurementPoint(240.0, 260.0),
            ),
        )
        val ssTool = requireNotNull(getAnnotationTool(TOOL_SS))
        val sacralLeft = MeasurementPoint(120.0, 250.0)
        var keyIndex = 0

        assertEquals(
            1,
            ManualMeasurementComposer.effectiveInteractionPoints(
                tool = ssTool,
                measurements = listOf(svaMeasurement),
            ),
        )

        val batch = ManualMeasurementComposer.buildBatch(
            tool = ssTool,
            userPoints = listOf(sacralLeft),
            measurements = listOf(svaMeasurement),
            standardDistanceMm = 100.0,
            standardDistancePoints = listOf(
                MeasurementPoint(0.0, 0.0),
                MeasurementPoint(200.0, 0.0),
            ),
            nextMeasurementKey = { toolId ->
                keyIndex += 1
                "manual_${toolId}_$keyIndex"
            },
        )

        assertNotNull(batch)
        assertEquals("SS", batch.primaryMeasurement.type)
        assertEquals(
            listOf(sacralLeft, svaMeasurement.points[4]),
            batch.primaryMeasurement.points,
        )
    }
}
