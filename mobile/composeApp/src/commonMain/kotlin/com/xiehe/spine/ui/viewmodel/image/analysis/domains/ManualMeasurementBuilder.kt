package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.domain.AnnotationCalibrationContext
import com.xiehe.spine.ui.components.analysis.viewer.domain.createManualAnnotationMeasurement

object ManualMeasurementBuilder {
    fun build(
        toolId: String,
        points: List<MeasurementPoint>,
        measurementKey: String,
        standardDistanceMm: Double?,
        standardDistancePoints: List<MeasurementPoint>,
    ): ImageAnalysisMeasurement? {
        return createManualAnnotationMeasurement(
            toolId = toolId,
            points = points,
            measurementKey = measurementKey,
            calibration = AnnotationCalibrationContext(
                standardDistanceMm = standardDistanceMm,
                standardDistancePoints = standardDistancePoints,
            ),
            standardDistanceMm = standardDistanceMm,
        )
    }
}
