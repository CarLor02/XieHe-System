package com.xiehe.spine.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

internal fun defaultTypography(): SpineAppTypography {
    val family = FontFamily.SansSerif
    return SpineAppTypography(
        display = TextStyle(fontFamily = family, fontWeight = FontWeight.Bold, fontSize = 30.sp),
        title = TextStyle(fontFamily = family, fontWeight = FontWeight.Bold, fontSize = 17.sp),
        body = TextStyle(fontFamily = family, fontWeight = FontWeight.Medium, fontSize = 14.sp),
        subhead = TextStyle(fontFamily = family, fontWeight = FontWeight.Normal, fontSize = 12.sp),
        caption = TextStyle(fontFamily = family, fontWeight = FontWeight.Normal, fontSize = 10.sp),
    )
}
