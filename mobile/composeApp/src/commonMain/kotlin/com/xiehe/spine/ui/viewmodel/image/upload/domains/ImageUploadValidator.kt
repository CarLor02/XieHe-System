package com.xiehe.spine.ui.viewmodel.image

object ImageUploadValidator {
    fun validate(state: ImageUploadUiState): String? {
        if (state.selectedPatientId == null) return "请选择患者"
        if (state.selectedFile == null) return "请选择要上传的影像文件"
        return null
    }
}
