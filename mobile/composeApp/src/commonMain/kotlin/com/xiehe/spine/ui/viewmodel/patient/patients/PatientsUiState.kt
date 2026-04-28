package com.xiehe.spine.ui.viewmodel.patient

import com.xiehe.spine.data.patient.PatientSummary

enum class GenderFilter(
    val label: String,
    val queryValue: String?,
) {
    ALL("全部性别", null),
    MALE("男", "male"),
    FEMALE("女", "female"),
}

enum class AgeFilter(
    val label: String,
    val min: Int?,
    val max: Int?,
) {
    ALL("全部年龄", null, null),
    AGE_0_18("0-18岁", 0, 18),
    AGE_19_40("19-40岁", 19, 40),
    AGE_41_60("41-60岁", 41, 60),
    AGE_60_PLUS("60岁以上", 61, null),
}

data class PatientsUiState(
    val loading: Boolean = false,
    val loadingMore: Boolean = false,
    val search: String = "",
    val genderFilter: GenderFilter = GenderFilter.ALL,
    val ageFilter: AgeFilter = AgeFilter.ALL,
    val items: List<PatientSummary> = emptyList(),
    val managedTotalCount: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1,
    val errorMessage: String? = null,
)
