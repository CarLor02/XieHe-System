package com.xiehe.spine.ui.components.form.picker

import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.icon.shared.IconToken
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
fun DatePickerField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showing by remember { mutableStateOf(false) }

    TextField(
        value = value,
        onValueChange = {},
        placeholder = "请选择出生日期",
        modifier = modifier.clickable { showing = true },
        readOnly = true,
        leadingGlyph = IconToken.CALENDAR,
        trailingText = "选择日期",
        onTrailingClick = { showing = true },
    )

    if (showing) {
        DateWheelPickerDialog(
            initialValue = value,
            onDismissRequest = { showing = false },
            onValueChange = onValueChange,
        )
    }
}

@Composable
fun DateWheelPickerDialog(
    initialValue: String,
    onDismissRequest: () -> Unit,
    onValueChange: (String) -> Unit,
) {
    val parsed = parseDate(initialValue)
    var yearIdx by remember { mutableIntStateOf((parsed.first - YEAR_START).coerceAtLeast(0)) }
    var monthIdx by remember { mutableIntStateOf(parsed.second - 1) }
    var dayIdx by remember { mutableIntStateOf(parsed.third - 1) }

    val years = remember { (YEAR_START..YEAR_END).map { "${it}年" } }
    val months = remember { (1..12).map { "${it}月" } }
    val currentYear = YEAR_START + yearIdx
    val currentMonth = monthIdx + 1
    val days = remember(currentYear, currentMonth) {
        (1..daysInMonth(currentYear, currentMonth)).map { "${it}日" }
    }
    if (dayIdx >= days.size) {
        dayIdx = days.lastIndex
    }

    val title = "${currentYear}年${currentMonth}月"
    val selectedDate = formatDate(currentYear, currentMonth, dayIdx + 1)

    LaunchedEffect(selectedDate) {
        onValueChange(selectedDate)
    }

    PickerDialog(
        title = "选择出生日期",
        onDismissRequest = onDismissRequest,
        showActionRow = false,
        edgeToEdge = true,
    ) {
        Text(
            text = "$title ▲",
            modifier = Modifier.fillMaxWidth(),
            style = SpineTheme.typography.title.copy(fontWeight = FontWeight.SemiBold),
            color = SpineTheme.colors.warning,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            WheelPickerColumn(
                options = years,
                selectedIndex = yearIdx,
                onSelectedIndexChange = { yearIdx = it },
            )
            WheelPickerColumn(
                options = months,
                selectedIndex = monthIdx,
                onSelectedIndexChange = { monthIdx = it },
            )
            WheelPickerColumn(
                options = days,
                selectedIndex = dayIdx,
                onSelectedIndexChange = { dayIdx = it },
            )
        }
    }
}

private const val YEAR_START = 1940
private const val YEAR_END = 2100

private fun parseDate(value: String): Triple<Int, Int, Int> {
    val parts = value.split('-')
    val y = parts.getOrNull(0)?.toIntOrNull() ?: 1990
    val m = parts.getOrNull(1)?.toIntOrNull() ?: 1
    val d = parts.getOrNull(2)?.toIntOrNull() ?: 1
    return Triple(y.coerceIn(YEAR_START, YEAR_END), m.coerceIn(1, 12), d.coerceIn(1, 31))
}

private fun formatDate(year: Int, month: Int, day: Int): String {
    return buildString {
        append(year.toString().padStart(4, '0'))
        append('-')
        append(month.toString().padStart(2, '0'))
        append('-')
        append(day.toString().padStart(2, '0'))
    }
}

private fun daysInMonth(year: Int, month: Int): Int {
    return when (month) {
        1, 3, 5, 7, 8, 10, 12 -> 31
        4, 6, 9, 11 -> 30
        2 -> if (isLeapYear(year)) 29 else 28
        else -> 30
    }
}

private fun isLeapYear(year: Int): Boolean {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}
