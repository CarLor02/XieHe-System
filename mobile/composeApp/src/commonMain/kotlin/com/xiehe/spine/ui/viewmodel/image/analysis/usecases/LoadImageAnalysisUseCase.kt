package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.data.measurement.MeasurementRepository
import com.xiehe.spine.ui.components.analysis.viewer.domain.DEFAULT_STANDARD_DISTANCE_MM

class LoadImageAnalysisUseCase(
    private val imageFileRepository: ImageFileRepository,
    private val measurementRepository: MeasurementRepository,
) {
    suspend operator fun invoke(
        fileId: Int,
        session: UserSession,
        onSessionExpired: (String) -> Unit = {},
    ): LoadImageAnalysisOutcome {
        var activeSession = session
        var imageBytes: ByteArray? = null
        var items: List<ImageAnalysisMeasurement> = emptyList()
        var reportText = ""
        var reportSavedAt = ""
        var standardDistanceMm: Double? = DEFAULT_STANDARD_DISTANCE_MM
        var standardDistancePoints: List<MeasurementPoint> = DEFAULT_STANDARD_DISTANCE_POINTS
        val errors = mutableListOf<String>()

        when (val measurementsResult = measurementRepository.loadMeasurements(activeSession, fileId)) {
            is AppResult.Success -> {
                activeSession = measurementsResult.data.first
                val payload = measurementsResult.data.second
                items = payload.measurements.mapIndexed { index, measurement ->
                    AnnotationPersistenceMapper.imageMeasurementToUiMeasurement(measurement, index)
                }
                reportText = payload.reportText.orEmpty()
                reportSavedAt = payload.savedAt.orEmpty()
                standardDistanceMm = payload.standardDistance?.takeIf { it > 0.0 } ?: standardDistanceMm
                standardDistancePoints = payload.standardDistancePoints.takeIf { it.size >= 2 } ?: standardDistancePoints
            }

            is AppResult.Failure -> {
                measurementsResult.notifySessionExpired(onSessionExpired)
                errors += measurementsResult.message
            }
        }

        when (val imageResult = imageFileRepository.downloadImageBytes(activeSession, fileId)) {
            is AppResult.Success -> {
                activeSession = imageResult.data.first
                imageBytes = imageResult.data.second
            }

            is AppResult.Failure -> {
                imageResult.notifySessionExpired(onSessionExpired)
                errors += imageResult.message
            }
        }

        return LoadImageAnalysisOutcome(
            session = activeSession,
            fileId = fileId,
            imageBytes = imageBytes,
            measurements = items,
            standardDistanceMm = standardDistanceMm ?: DEFAULT_STANDARD_DISTANCE_MM,
            standardDistancePoints = standardDistancePoints,
            reportText = reportText,
            reportSavedAt = reportSavedAt,
            errorMessage = errors.firstOrNull(),
            bannerMessage = if (errors.size > 1) errors.joinToString("；") else null,
        )
    }
}

data class LoadImageAnalysisOutcome(
    val session: UserSession,
    val fileId: Int,
    val imageBytes: ByteArray?,
    val measurements: List<ImageAnalysisMeasurement>,
    val standardDistanceMm: Double,
    val standardDistancePoints: List<MeasurementPoint>,
    val reportText: String,
    val reportSavedAt: String,
    val errorMessage: String?,
    val bannerMessage: String?,
)
