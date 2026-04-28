package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.currentEpochSeconds
import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.measurement.MeasurementRepository
import com.xiehe.spine.data.measurement.SaveMeasurementsRequest
import kotlin.time.Instant

class SaveMeasurementsUseCase(
    private val measurementRepository: MeasurementRepository,
) {
    suspend operator fun invoke(
        snapshot: ImageAnalysisUiState,
        session: UserSession,
        examType: String,
        patientId: Int?,
        onSessionExpired: (String) -> Unit = {},
    ): SaveMeasurementsOutcome {
        val fileId = snapshot.fileId ?: return SaveMeasurementsOutcome.Invalid("当前影像不存在")
        val computedMeasurements = snapshot.measurements
            .filter { it.kind == AnalysisMeasurementKind.COMPUTED }
            .filter { it.points.size >= 2 && it.value != "--" && it.type != "标准距离" && !it.auxiliary }
        val detectedKeypoints = snapshot.measurements
            .filter { it.kind == AnalysisMeasurementKind.DETECTED }
            .filter { it.points.isNotEmpty() }
        val persistableMeasurements = buildList {
            addAll(computedMeasurements)
            addAll(detectedKeypoints)
        }
        if (persistableMeasurements.isEmpty()) {
            return SaveMeasurementsOutcome.Invalid("暂无可保存的标注数据")
        }

        val reportText = snapshot.reportText.ifBlank { "" }
        val savedAt = Instant.fromEpochSeconds(currentEpochSeconds()).toString()
        val saveRequest = SaveMeasurementsRequest(
            examType = examType,
            imageId = fileId.toString(),
            patientId = patientId?.toString(),
            measurements = persistableMeasurements.map(AnnotationPersistenceMapper::toSaveMeasurementItem),
            reportText = reportText,
            savedAt = savedAt,
        )

        return when (val result = measurementRepository.saveMeasurements(session, fileId, saveRequest)) {
            is AppResult.Success -> {
                SaveMeasurementsOutcome.Success(
                    session = result.data.first,
                    reportText = reportText,
                    savedAt = savedAt,
                )
            }

            is AppResult.Failure -> {
                if (result.notifySessionExpired(onSessionExpired)) {
                    SaveMeasurementsOutcome.Expired
                } else {
                    SaveMeasurementsOutcome.Failure(result.message)
                }
            }
        }
    }
}

sealed interface SaveMeasurementsOutcome {
    data class Success(
        val session: UserSession,
        val reportText: String,
        val savedAt: String,
    ) : SaveMeasurementsOutcome

    data class Invalid(val message: String) : SaveMeasurementsOutcome
    data class Failure(val message: String) : SaveMeasurementsOutcome
    data object Expired : SaveMeasurementsOutcome
}
