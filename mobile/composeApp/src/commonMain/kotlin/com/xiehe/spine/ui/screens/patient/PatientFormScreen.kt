package com.xiehe.spine.ui.screens.patient

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.ui.components.button.shared.Button
import com.xiehe.spine.ui.components.form.picker.DatePickerField
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.patient.PatientFormViewModel

private data class GenderOption(
    val label: String,
    val value: String,
)

private enum class PatientFormPicker {
    GENDER,
    PHONE_PREFIX,
}

@Composable
fun PatientFormScreen(
    vm: PatientFormViewModel,
    session: UserSession,
    repository: PatientRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSubmitSuccess: () -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()
    val scroll = rememberScrollState()
    var picker by remember { mutableStateOf<PatientFormPicker?>(null) }

    val genderOptions = listOf(
        GenderOption("男", "male"),
        GenderOption("女", "female"),
    )
    val phonePrefixOptions = listOf("+86", "+852", "+853", "+886")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scroll)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            TextField(
                value = state.name,
                onValueChange = vm::updateName,
                placeholder = "请输入患者姓名",
                leadingGlyph = IconToken.USER_ROUND,
            )

            PickerField(
                text = genderOptions.firstOrNull { it.value == state.gender }?.label ?: "请选择患者性别",
                onClick = { picker = PatientFormPicker.GENDER },
                leadingGlyph = IconToken.USER,
            )

            DatePickerField(
                value = state.birthDate,
                onValueChange = vm::updateBirthDate,
                modifier = Modifier.fillMaxWidth(),
            )

            TextField(
                value = state.idCard,
                onValueChange = vm::updateIdCard,
                placeholder = "请输入18位身份证号(可选)",
                leadingGlyph = IconToken.LOCK,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PickerField(
                    text = state.phonePrefix,
                    onClick = { picker = PatientFormPicker.PHONE_PREFIX },
                    leadingGlyph = IconToken.PHONE,
                    modifier = Modifier.weight(0.45f),
                )
                TextField(
                    value = state.phoneLocalNumber,
                    onValueChange = vm::updatePhoneLocalNumber,
                    placeholder = if (state.phonePrefix == "+86") "请输入11位手机号" else "请输入号码",
                    leadingGlyph = IconToken.PHONE,
                    modifier = Modifier.weight(0.55f),
                )
            }

            TextField(
                value = state.email,
                onValueChange = vm::updateEmail,
                placeholder = "请输入邮箱(可选)",
                leadingGlyph = IconToken.MESSAGE,
            )
            TextField(
                value = state.address,
                onValueChange = vm::updateAddress,
                placeholder = "请输入家庭地址(可选)",
                leadingGlyph = IconToken.EDIT,
            )

            state.errorMessage?.let {
                Text(text = it, style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error))
            }

            Button(
                text = if (state.loading) "提交中..." else "创建患者",
                onClick = {
                    vm.submit(
                        session = session,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        onSuccess = onSubmitSuccess,
                        onSessionExpired = onSessionExpired,
                    )
                },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
                leadingGlyph = IconToken.CHECK,
            )
        }

        if (state.loading) {
            LoadingOverlay(message = "...正在加载中")
        }
    }

    when (picker) {
        PatientFormPicker.GENDER -> {
            OptionPickerOverlay(
                title = "请选择患者性别",
                options = genderOptions.map { it.label },
                selected = genderOptions.firstOrNull { it.value == state.gender }?.label.orEmpty(),
                onDismiss = { picker = null },
                onSelect = { selectedLabel ->
                    genderOptions.firstOrNull { it.label == selectedLabel }?.let { option ->
                        vm.updateGender(option.value)
                    }
                },
            )
        }

        PatientFormPicker.PHONE_PREFIX -> {
            OptionPickerOverlay(
                title = "请选择电话区号",
                options = phonePrefixOptions,
                selected = state.phonePrefix,
                onDismiss = { picker = null },
                onSelect = vm::updatePhonePrefix,
            )
        }

        null -> Unit
    }
}

@Composable
private fun PickerField(
    text: String,
    onClick: () -> Unit,
    leadingGlyph: IconToken,
    modifier: Modifier = Modifier,
) {
    TextField(
        value = text,
        onValueChange = {},
        placeholder = text,
        modifier = modifier.clickable(onClick = onClick),
        readOnly = true,
        leadingGlyph = leadingGlyph,
        trailingText = "选择",
        onTrailingClick = onClick,
    )
}
