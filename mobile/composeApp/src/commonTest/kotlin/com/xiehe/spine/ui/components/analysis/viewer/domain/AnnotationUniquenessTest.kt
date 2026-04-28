package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_COBB
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PELVIC
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_T1_TILT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AnnotationUniquenessTest {
    @Test
    fun poAndCssAliasesBlockPelvicAndSacralTools() {
        val measurements = listOf(
            measurement("po", "PO"),
            measurement("css", "CSS"),
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
            measurement("cobb-1", "Cobb"),
            measurement("distance-1", "距离标注"),
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
            measurement("t1-1", "T1 Tilt"),
            measurement("t1-2", "T1 Tilt"),
            measurement("cobb-1", "Cobb"),
            measurement("cobb-2", "Cobb"),
        )

        assertEquals(
            listOf("t1-1", "cobb-1", "cobb-2"),
            filterUniqueAnnotationDuplicates(measurements).map { it.key },
        )
        assertTrue(isUniqueAnnotationTool(TOOL_T1_TILT))
    }

    @Test
    fun tsAndTtsUsePointCountForCanonicalMatching() {
        val fourPointTts = measurement("tts-4", "TTS", pointCount = 4)
        val sixPointTts = measurement("tts-6", "TTS", pointCount = 6)
        val sixPointTs = measurement("ts-6", "TS", pointCount = 6)

        assertTrue(measurementMatchesTool(fourPointTts, requireNotNull(getAnnotationTool(TOOL_TS))))
        assertFalse(
            measurementMatchesTool(fourPointTts, requireNotNull(getAnnotationTool(TOOL_C7_OFFSET))),
        )
        assertTrue(
            measurementMatchesTool(sixPointTts, requireNotNull(getAnnotationTool(TOOL_C7_OFFSET))),
        )
        assertTrue(
            measurementMatchesTool(sixPointTs, requireNotNull(getAnnotationTool(TOOL_C7_OFFSET))),
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
