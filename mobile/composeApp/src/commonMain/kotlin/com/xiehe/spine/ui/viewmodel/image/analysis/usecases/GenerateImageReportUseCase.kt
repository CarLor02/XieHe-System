package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.measurement.GenerateReportRequest
import com.xiehe.spine.data.measurement.MeasurementRepository
import com.xiehe.spine.data.report.mapImageCategoryToReportExamType

class GenerateImageReportUseCase(
    private val measurementRepository: MeasurementRepository,
) {
    suspend fun loadExistingReport(
        session: UserSession,
        fileId: Int,
        onSessionExpired: (String) -> Unit = {},
    ): LoadExistingReportOutcome {
        return when (val result = measurementRepository.loadMeasurements(session, fileId)) {
            is AppResult.Success -> {
                val payload = result.data.second
                LoadExistingReportOutcome.Success(
                    session = result.data.first,
                    reportText = payload.reportText.orEmpty(),
                    reportSavedAt = payload.savedAt.orEmpty(),
                )
            }

            is AppResult.Failure -> {
                if (result.notifySessionExpired(onSessionExpired)) {
                    LoadExistingReportOutcome.Expired
                } else {
                    LoadExistingReportOutcome.Failure(result.message)
                }
            }
        }
    }

    suspend fun generate(
        session: UserSession,
        snapshot: ImageAnalysisUiState,
        examType: String,
        onSessionExpired: (String) -> Unit = {},
    ): GenerateImageReportOutcome {
        val fileId = snapshot.fileId ?: return GenerateImageReportOutcome.Invalid("当前影像不存在")
        val reportExamType = mapImageCategoryToReportExamType(examType)
            ?: return GenerateImageReportOutcome.Invalid("体态照片暂不支持AI报告生成")
        val reportItems = snapshot.measurements.mapNotNull(AnnotationPersistenceMapper::toGenerateReportItem)
        if (reportItems.isEmpty()) {
            return GenerateImageReportOutcome.Invalid("暂无可用于生成报告的测量数据")
        }

        val request = GenerateReportRequest(
            examType = reportExamType,
            imageId = fileId.toString(),
            measurements = reportItems,
        )
        return when (val result = measurementRepository.generateReport(session, request)) {
            is AppResult.Success -> {
                val payload = result.data.second
                GenerateImageReportOutcome.Success(
                    session = result.data.first,
                    report = payload.report,
                    generatedAt = payload.generatedAt.orEmpty(),
                )
            }

            is AppResult.Failure -> {
                if (result.notifySessionExpired(onSessionExpired)) {
                    GenerateImageReportOutcome.Expired
                } else {
                    GenerateImageReportOutcome.Failure(result.message)
                }
            }
        }
    }
}

sealed interface LoadExistingReportOutcome {
    data class Success(
        val session: UserSession,
        val reportText: String,
        val reportSavedAt: String,
    ) : LoadExistingReportOutcome

    data class Failure(val message: String) : LoadExistingReportOutcome
    data object Expired : LoadExistingReportOutcome
}

sealed interface GenerateImageReportOutcome {
    data class Success(
        val session: UserSession,
        val report: String,
        val generatedAt: String,
    ) : GenerateImageReportOutcome

    data class Invalid(val message: String) : GenerateImageReportOutcome
    data class Failure(val message: String) : GenerateImageReportOutcome
    data object Expired : GenerateImageReportOutcome
}
