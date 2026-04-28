package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
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
    fun webAuxiliaryShapeTypesAreRecognizedWhenLoaded() {
        assertTrue(isPersistedAuxiliaryAnnotationType("箭头标注"))
        assertTrue(isPersistedAuxiliaryAnnotationType("圆形标注"))
    }

    private fun arrowMeasurement(description: String): AnnotationMeasurement {
        return AnnotationMeasurement(
            key = "arrow-1",
            type = "Arrow",
            value = "辅助图形",
            points = listOf(
                MeasurementPoint(10.0, 10.0),
                MeasurementPoint(60.0, 60.0),
            ),
            description = description,
            auxiliary = true,
        )
    }
}
