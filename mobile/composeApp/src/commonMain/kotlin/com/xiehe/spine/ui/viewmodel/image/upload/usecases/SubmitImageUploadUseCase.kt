package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.image.ImageFileRepository

data class SubmitImageUploadCommand(
    val patientId: Int,
    val examType: ImageCategory,
    val file: UploadFilePayload,
)

class SubmitImageUploadUseCase(
    private val imageFileRepository: ImageFileRepository,
) {
    suspend operator fun invoke(
        session: UserSession,
        command: SubmitImageUploadCommand,
    ): SubmitImageUploadOutcome {
        return when (
            val result = imageFileRepository.uploadSingleImage(
                session = session,
                patientId = command.patientId,
                examType = command.examType.label,
                fileName = command.file.name,
                bytes = command.file.bytes,
                mimeType = command.file.mimeType,
                description = command.examType.label,
            )
        ) {
            is AppResult.Success -> SubmitImageUploadOutcome.Success(result.data.first)

            is AppResult.Failure -> SubmitImageUploadOutcome.Failure(result)
        }
    }
}

sealed interface SubmitImageUploadOutcome {
    data class Success(val session: UserSession) : SubmitImageUploadOutcome
    data class Failure(val error: AppResult.Failure) : SubmitImageUploadOutcome
}
