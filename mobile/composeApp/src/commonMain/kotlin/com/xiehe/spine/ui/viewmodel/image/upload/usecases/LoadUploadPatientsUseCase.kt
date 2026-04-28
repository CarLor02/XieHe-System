package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.data.patient.PatientSummary

class LoadUploadPatientsUseCase(
    private val patientRepository: PatientRepository,
) {
    suspend operator fun invoke(
        session: UserSession,
    ): LoadUploadPatientsOutcome {
        var activeSession = session
        var page = 1
        var totalPages = 1
        val aggregate = mutableListOf<PatientSummary>()

        while (page <= totalPages) {
            when (
                val result = patientRepository.loadPatients(
                    session = activeSession,
                    page = page,
                    pageSize = 50,
                    search = "",
                )
            ) {
                is AppResult.Success -> {
                    activeSession = result.data.first
                    val payload = result.data.second
                    aggregate += payload.items
                    page += 1
                    totalPages = payload.pagination.totalPages.coerceAtLeast(1)
                }

                is AppResult.Failure -> return LoadUploadPatientsOutcome.Failure(result)
            }
        }

        return LoadUploadPatientsOutcome.Success(
            session = activeSession,
            patients = aggregate,
        )
    }
}

sealed interface LoadUploadPatientsOutcome {
    data class Success(
        val session: UserSession,
        val patients: List<PatientSummary>,
    ) : LoadUploadPatientsOutcome
    data class Failure(val error: AppResult.Failure) : LoadUploadPatientsOutcome
}
