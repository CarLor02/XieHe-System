package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_COBB
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_L4
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L4_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PELVIC
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SVA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T10_L2
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_SLOPE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T2_T5
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TK_T5_T12
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TPA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_VERTEBRA_CENTER
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AnnotationUniquenessTest {
    @Test
    fun pelvicAndSacralKeysBlockTheirTools() {
        val measurements = listOf(
            measurement("pelvic", TOOL_PELVIC),
            measurement("sacral", TOOL_SACRAL),
        )

        assertTrue(
            hasUniqueAnnotationForTool(measurements, requireNotNull(getAnnotationTool(TOOL_PELVIC))),
        )
        assertTrue(
            hasUniqueAnnotationForTool(measurements, requireNotNull(getAnnotationTool(TOOL_SACRAL))),
        )
    }

    @Test
    fun cobbAndDistanceAnnotationCanRepeat() {
        val measurements = listOf(
            measurement("cobb-1", TOOL_COBB),
            measurement("distance-1", TOOL_AUX_LENGTH),
        )

        assertFalse(
            hasUniqueAnnotationForTool(measurements, requireNotNull(getAnnotationTool(TOOL_COBB))),
        )
        assertFalse(
            hasUniqueAnnotationForTool(measurements, requireNotNull(getAnnotationTool(TOOL_AUX_LENGTH))),
        )
    }

    @Test
    fun duplicateUniqueMeasurementsAreFilteredButRepeatableMeasurementsRemain() {
        val measurements = listOf(
            measurement("t1-1", TOOL_T1_TILT),
            measurement("t1-2", TOOL_T1_TILT),
            measurement("cobb-1", TOOL_COBB),
            measurement("cobb-2", TOOL_COBB),
        )

        assertEquals(
            listOf("t1-1", "cobb-1", "cobb-2"),
            filterUniqueAnnotationDuplicates(measurements).map { it.key },
        )
        assertTrue(isUniqueAnnotationTool(TOOL_T1_TILT))
    }

    @Test
    fun lateralMeasurementsAreUniqueExceptVertebraCenter() {
        val lateralToolIds = listOf(
            TOOL_T1_SLOPE,
            TOOL_CL,
            TOOL_TK_T2_T5,
            TOOL_TK_T5_T12,
            TOOL_T10_L2,
            TOOL_LL_L1_S1,
            TOOL_LL_L1_L4,
            TOOL_LL_L4_S1,
            TOOL_TPA,
            TOOL_SVA,
            TOOL_PI,
            TOOL_PT,
            TOOL_SS,
        )

        lateralToolIds.forEach { toolId ->
            val tool = requireNotNull(getAnnotationTool(toolId))
            val measurements = listOf(measurement("${toolId}-1", tool.id))

            assertTrue(isUniqueAnnotationTool(toolId), "$toolId should be unique")
            assertTrue(hasUniqueAnnotationForTool(measurements, tool), "$toolId should be blocked after creation")
        }

        assertFalse(isUniqueAnnotationTool(TOOL_VERTEBRA_CENTER))
    }

    @Test
    fun duplicateLateralMeasurementsAreFiltered() {
        val measurements = listOf(
            measurement("t1-slope-1", TOOL_T1_SLOPE),
            measurement("t1-slope-2", TOOL_T1_SLOPE),
            measurement("cl-1", TOOL_CL),
            measurement("cl-2", TOOL_CL),
            measurement("vertebra-center-1", TOOL_VERTEBRA_CENTER),
            measurement("vertebra-center-2", TOOL_VERTEBRA_CENTER),
        )

        assertEquals(
            listOf("t1-slope-1", "cl-1", "vertebra-center-1", "vertebra-center-2"),
            filterUniqueAnnotationDuplicates(measurements).map { it.key },
        )
    }

    @Test
    fun tsAndTtsUsePointCountForCanonicalMatching() {
        val trunkShift = measurement("tts-4", TOOL_TS, pointCount = 4)
        val c7Offset = measurement("c7-offset-6", TOOL_C7_OFFSET, pointCount = 6)

        assertTrue(measurementMatchesTool(trunkShift, requireNotNull(getAnnotationTool(TOOL_TS))))
        assertFalse(
            measurementMatchesTool(trunkShift, requireNotNull(getAnnotationTool(TOOL_C7_OFFSET))),
        )
        assertTrue(
            measurementMatchesTool(c7Offset, requireNotNull(getAnnotationTool(TOOL_C7_OFFSET))),
        )
    }

    private fun measurement(
        key: String,
        type: String,
        pointCount: Int = 2,
    ) = AnnotationMeasurement(
        key = key,
        type = type,
        value = "--",
        points = List(pointCount) { index ->
            MeasurementPoint(10.0 + index, 20.0 + index)
        },
    )
}
