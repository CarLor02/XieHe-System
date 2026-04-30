package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ARROW
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_CIRCLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_HORIZONTAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_POLYGON
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_VERTICAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_VERTEBRA_CENTER
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AuxiliaryAnnotationMetadataTest {
    @Test
    fun editableLabelHidesGeneratedAuxiliaryPrefix() {
        val measurement = arrowMeasurement(description = "辅助图形-Arrow")

        assertEquals("Arrow", editableAuxiliaryAnnotationLabel(measurement))
    }

    @Test
    fun customAuxiliaryLabelIsEditableAndDisplayed() {
        val measurement = arrowMeasurement(description = "术前箭头")

        assertTrue(isEditableAuxiliaryAnnotation(measurement))
        assertEquals("术前箭头", editableAuxiliaryAnnotationLabel(measurement))
        assertEquals("术前箭头", formatAuxiliaryTag(measurement))
    }

    @Test
    fun auxiliaryShapeKeysAreRecognizedWhenLoaded() {
        assertTrue(isPersistedAuxiliaryAnnotationType(TOOL_AUX_ARROW))
        assertTrue(isPersistedAuxiliaryAnnotationType(TOOL_AUX_CIRCLE))
        assertTrue(isPersistedAuxiliaryAnnotationType(TOOL_AUX_POLYGON))
        assertTrue(isPersistedAuxiliaryAnnotationType(TOOL_AUX_ANGLE))
        assertTrue(isPersistedAuxiliaryAnnotationType(TOOL_AUX_LENGTH))
    }

    @Test
    fun allAuxiliaryAnnotationsCanBeRenamed() {
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_AUX_POLYGON)))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_VERTEBRA_CENTER)))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_AUX_LENGTH)))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_AUX_ANGLE)))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_AUX_HORIZONTAL_LINE)))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = TOOL_AUX_VERTICAL_LINE)))
    }

    @Test
    fun auxiliaryMeasurementValueLabelUsesToolLabelUntilRenamed() {
        val defaultLength = auxiliaryMeasurement(
            type = TOOL_AUX_LENGTH,
            description = "辅助距离测量",
        )
        val customLength = auxiliaryMeasurement(
            type = TOOL_AUX_LENGTH,
            description = "术前距离",
        )
        val blankLength = auxiliaryMeasurement(
            type = TOOL_AUX_LENGTH,
            description = "",
        )

        assertEquals("距离标注", editableAuxiliaryAnnotationLabel(defaultLength))
        assertEquals("术前距离", editableAuxiliaryAnnotationLabel(customLength))
        assertEquals("距离标注", editableAuxiliaryAnnotationLabel(blankLength))
    }

    private fun arrowMeasurement(description: String): AnnotationMeasurement {
        return auxiliaryMeasurement(type = TOOL_AUX_ARROW, description = description)
    }

    private fun auxiliaryMeasurement(
        type: String,
        description: String = "辅助图形-$type",
    ): AnnotationMeasurement {
        return AnnotationMeasurement(
            key = "$type-1",
            type = type,
            value = "辅助图形",
            points = listOf(
                MeasurementPoint(10.0, 10.0),
                MeasurementPoint(60.0, 60.0),
                MeasurementPoint(80.0, 80.0),
                MeasurementPoint(100.0, 100.0),
            ),
            description = description,
            auxiliary = true,
        )
    }
}
