package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint

object CanvasPointNormalizer {
    fun normalize(
        toolId: String,
        pendingPoints: List<MeasurementPoint>,
        point: MeasurementPoint,
    ): MeasurementPoint {
        if (pendingPoints.isEmpty()) return point
        return when (toolId) {
            TOOL_TS,
            TOOL_AUX_HORIZONTAL_LINE -> MeasurementPoint(
                x = point.x,
                y = pendingPoints.first().y,
            )

            TOOL_AUX_VERTICAL_LINE -> MeasurementPoint(
                x = pendingPoints.first().x,
                y = point.y,
            )

            else -> point
        }
    }
}
