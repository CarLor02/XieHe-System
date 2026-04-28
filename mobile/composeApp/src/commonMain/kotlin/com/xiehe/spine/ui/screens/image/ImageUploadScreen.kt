package com.xiehe.spine.ui.screens.image

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.file.rememberImageFilePickerLauncher
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.screens.image.components.ImageUploadFileList
import com.xiehe.spine.ui.screens.image.components.ImageUploadOptionsOverlay
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.ImageUploadViewModel
import com.xiehe.spine.ui.viewmodel.image.UploadFileStatus

private enum class ImageUploadPicker {
    PATIENT,
}

@Composable
fun ImageUploadScreen(
    vm: ImageUploadViewModel,
    session: UserSession,
    onSessionUpdated: (UserSession) -> Unit,
    onUploadSuccess: () -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()
    val scroll = rememberScrollState()
    var picker by remember { mutableStateOf<ImageUploadPicker?>(null) }
    var activeOptionsFileId by remember { mutableStateOf<String?>(null) }

    val imagePicker = rememberImageFilePickerLauncher { picked ->
        if (picked != null) {
            activeOptionsFileId = vm.appendUploadFile(
                name = picked.name,
                mimeType = picked.mimeType,
                bytes = picked.bytes,
            )
        }
    }

    LaunchedEffect(session.accessToken) {
        vm.loadPatients(
            session = session,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    val selectedPatientName = state.patients.firstOrNull { it.id == state.selectedPatientId }?.name ?: "请选择患者"
    val activeOptionsFile = state.uploadFiles.firstOrNull { it.id == activeOptionsFileId }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scroll)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PickerField(
                text = selectedPatientName,
                leadingGlyph = IconToken.PATIENTS,
                onClick = { picker = ImageUploadPicker.PATIENT },
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                Text(
                    text = "选择文件",
                    modifier = Modifier
                        .background(
                            color = SpineTheme.colors.primaryMuted,
                            shape = RoundedCornerShape(SpineTheme.radius.full),
                        )
                        .clickable { imagePicker.launch() }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
                    color = SpineTheme.colors.primary,
                )
            }

            ImageUploadFileList(
                files = state.uploadFiles,
                onAdjust = { activeOptionsFileId = it },
                onRemove = { fileId ->
                    vm.removeUploadFile(fileId)
                    if (activeOptionsFileId == fileId) {
                        activeOptionsFileId = null
                    }
                },
            )

            Button(
                text = if (state.uploading) "上传中..." else "上传影像",
                onClick = {
                    vm.submit(
                        session = session,
                        onSessionUpdated = onSessionUpdated,
                        onSuccess = onUploadSuccess,
                        onSessionExpired = onSessionExpired,
                    )
                },
                enabled = !state.uploading && state.uploadFiles.any { it.status == UploadFileStatus.PENDING },
                modifier = Modifier.fillMaxWidth(),
                leadingGlyph = IconToken.UPLOAD,
            )
        }

        if (state.uploading || state.loadingPatients) {
            LoadingOverlay(message = "...正在加载中")
        }

        val toastMessage = state.errorMessage ?: state.successMessage
        if (toastMessage != null) {
            FloatingToast(
                message = toastMessage,
                accentColor = if (state.errorMessage != null) {
                    SpineTheme.colors.error
                } else {
                    SpineTheme.colors.success
                },
                icon = if (state.errorMessage != null) IconToken.MESSAGE else IconToken.CHECK,
                onDismiss = vm::clearMessages,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }
    }

    when (picker) {
        ImageUploadPicker.PATIENT -> {
            OptionPickerOverlay(
                title = "选择患者",
                options = state.patients.map { it.name },
                selected = selectedPatientName,
                onDismiss = { picker = null },
                onSelect = { selectedName ->
                    state.patients.firstOrNull { it.name == selectedName }?.let { patient ->
                        vm.updatePatient(patient.id)
                    }
                },
            )
        }

        null -> Unit
    }

    if (activeOptionsFile != null) {
        ImageUploadOptionsOverlay(
            file = activeOptionsFile,
            examTypes = state.examTypes,
            onExamTypeChange = { vm.updateFileExamType(activeOptionsFile.id, it) },
            onFlip = { vm.flipFile(activeOptionsFile.id) },
            onCrop = { vm.cropFile(activeOptionsFile.id, it) },
            onDismiss = { activeOptionsFileId = null },
            onConfirm = { activeOptionsFileId = null },
        )
    }
}

@Composable
private fun PickerField(
    text: String,
    leadingGlyph: IconToken,
    onClick: () -> Unit,
) {
    TextField(
        value = text,
        onValueChange = {},
        placeholder = text,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        readOnly = true,
        leadingGlyph = leadingGlyph,
        trailingText = "选择",
        onTrailingClick = onClick,
    )
}
