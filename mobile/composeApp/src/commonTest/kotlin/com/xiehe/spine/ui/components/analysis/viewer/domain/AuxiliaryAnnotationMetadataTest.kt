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
        assertTrue(isPersistedAuxiliaryAnnotationType("多边形标注"))
        assertTrue(isPersistedAuxiliaryAnnotationType("角度标注"))
        assertTrue(isPersistedAuxiliaryAnnotationType("距离标注"))
    }

    @Test
    fun allAuxiliaryAnnotationsCanBeRenamed() {
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "Polygons")))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "椎体中心")))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "距离标注")))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "角度标注")))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "辅助水平线")))
        assertTrue(isEditableAuxiliaryAnnotation(auxiliaryMeasurement(type = "辅助垂直线")))
    }

    private fun arrowMeasurement(description: String): AnnotationMeasurement {
        return auxiliaryMeasurement(type = "Arrow", description = description)
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
