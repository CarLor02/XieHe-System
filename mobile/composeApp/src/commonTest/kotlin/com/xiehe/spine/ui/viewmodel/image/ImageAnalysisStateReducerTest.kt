package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ImageAnalysisStateReducerTest {

    @Test
    fun releaseRetainedImageState_clearsLoadedImageAndMeasurements() {
        val source = ImageAnalysisUiState(
            loading = true,
            saving = true,
            aiRunning = true,
            aiRunningLabel = "AI检测中",
            fileId = 42,
            imageBytes = byteArrayOf(1, 2, 3),
            measurements = listOf(
                AnnotationMeasurement(
                    key = "manual_1",
                    type = "Cobb",
                    value = "12.5°",
                    points = listOf(MeasurementPoint(10.0, 20.0)),
                ),
            ),
            hiddenMeasurementKeys = setOf("manual_1"),
            pendingPoints = listOf(MeasurementPoint(30.0, 40.0)),
            reportText = "draft",
            reportExamType = "AP",
            reportImageId = "42",
            reportPatientId = "7",
            bannerMessage = "stale",
            errorMessage = "error",
            zoomPercent = 180f,
            contrast = 15,
            brightness = -10,
        )

        val released = ImageAnalysisStateReducer.releaseRetainedImageState(source)

        assertNull(released.fileId)
        assertNull(released.imageBytes)
        assertTrue(released.measurements.isEmpty())
        assertTrue(released.hiddenMeasurementKeys.isEmpty())
        assertTrue(released.pendingPoints.isEmpty())
        assertEquals("", released.reportText)
        assertEquals("", released.reportExamType)
        assertEquals("", released.reportImageId)
        assertEquals("", released.reportPatientId)
        assertNull(released.bannerMessage)
        assertNull(released.errorMessage)
        assertFalse(released.loading)
        assertFalse(released.saving)
        assertFalse(released.aiRunning)
        assertNull(released.aiRunningLabel)
        assertEquals(180f, released.zoomPercent)
        assertEquals(15, released.contrast)
        assertEquals(-10, released.brightness)
    }
}
