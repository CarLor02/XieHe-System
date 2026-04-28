package com.xiehe.spine.ui.components.icon.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource

@Composable
actual fun platformIconPainter(glyph: IconToken): Painter {
    val context = LocalContext.current
    val resId = context.resources.getIdentifier(
        glyph.androidDrawableName(),
        "drawable",
        context.packageName,
    )
    return painterResource(id = if (resId != 0) resId else android.R.drawable.ic_menu_help)
}

private fun IconToken.androidDrawableName(): String {
    return when (this) {
        IconToken.DASHBOARD,
        IconToken.LAYOUT_DASHBOARD,
        -> "icons_navigation_icon_dashboard"

        IconToken.PATIENTS -> "icons_navigation_icon_patients"
        IconToken.HEART_PULSE -> "icons_status_icon_heart_pulse"
        IconToken.IMAGES -> "icons_navigation_icon_images"
        IconToken.MESSAGE -> "icons_status_icon_message"
        IconToken.PROFILE,
        IconToken.USER,
        IconToken.USER_ROUND,
        -> "icons_navigation_icon_profile"

        IconToken.USER_PLUS -> "icons_action_icon_user_plus"
        IconToken.BACK -> "icons_action_icon_back"
        IconToken.ADD -> "icons_action_icon_add"
        IconToken.BELL,
        IconToken.BELL_RING,
        -> "icons_action_icon_bell"

        IconToken.SAVE -> "icons_action_icon_save"
        IconToken.IMPORT -> "icons_action_icon_import"
        IconToken.EXPORT -> "icons_action_icon_export"
        IconToken.UPLOAD -> "icons_action_icon_upload"
        IconToken.MINUS -> "icons_action_icon_minus"
        IconToken.USERS -> "icons_status_icon_users"
        IconToken.HOURGLASS -> "icons_status_icon_hourglass"
        IconToken.CHECK -> "icons_status_icon_check"
        IconToken.IMAGE -> "icons_status_icon_image"
        IconToken.MAGIC_WAND -> "icons_action_icon_magicwand"
        IconToken.SCAN_SEARCH -> "icons_status_icon_scan_search"
        IconToken.SEARCH -> "icons_action_icon_search"
        IconToken.PHONE -> "icons_action_icon_phone"
        IconToken.EDIT -> "icons_action_icon_edit"
        IconToken.CALENDAR -> "icons_action_icon_calendar"
        IconToken.CLOCK -> "icons_action_icon_clock"
        IconToken.LOCK -> "icons_status_icon_lock"
        IconToken.SETTINGS -> "icons_status_icon_settings"
        IconToken.ARROW_RIGHT,
        IconToken.CHEVRON_RIGHT,
        -> "icons_action_icon_chevron_right"

        IconToken.CHEVRON_DOWN -> "icons_action_icon_chevron_down"
        IconToken.EYE -> "icons_action_icon_eye"
        IconToken.EYE_OFF -> "icons_action_icon_eye_off"
        IconToken.DOWNLOAD -> "icons_action_icon_download"
        IconToken.DELETE -> "icons_action_icon_delete"
        IconToken.AI_DETECT -> "icons_analysis_icon_ai_detect"
        IconToken.AI_MEASURE -> "icons_analysis_icon_ai_measure"
        IconToken.REPORT -> "icons_analysis_icon_report"
        IconToken.MEASURE_TOOLKIT -> "icons_analysis_icon_toolkit"
        IconToken.MEASURE_TOGGLE_TOOLKIT -> "icons_measure_icon_toggle_toolkit"
        IconToken.MEASURE_TOGGLE_MEASURE_LIST -> "icons_measure_icon_toggle_measure_list"
        IconToken.MEASURE_TO_FULLSCREEN -> "icons_measure_icon_to_fullscreen"
        IconToken.MEASURE_MOVE -> "icons_measure_toolkit_move"
        IconToken.MEASURE_ZOOM -> "icons_measure_action_zoom"
        IconToken.MEASURE_UNDO -> "icons_measure_action_undo"
        IconToken.MEASURE_REDO -> "icons_measure_action_redo"
        IconToken.MEASURE_T1_TILT -> "icons_measure_toolkit_t1_tilt"
        IconToken.MEASURE_COBB -> "icons_measure_toolkit_cobb"
        IconToken.MEASURE_CA -> "icons_measure_toolkit_ca"
        IconToken.MEASURE_PELVIC -> "icons_measure_toolkit_pelvic"
        IconToken.MEASURE_SACRAL -> "icons_measure_toolkit_sacral"
        IconToken.MEASURE_TS -> "icons_measure_toolkit_ts"
        IconToken.MEASURE_AVT -> "icons_measure_toolkit_avt"
        IconToken.MEASURE_LLD -> "icons_measure_toolkit_lld"
        IconToken.MEASURE_C7_OFFSET -> "icons_measure_toolkit_c7_offset"
        IconToken.MEASURE_T1_SLOPE -> "icons_measure_toolkit_t1_slope"
        IconToken.MEASURE_CL -> "icons_measure_toolkit_cl"
        IconToken.MEASURE_TK_T2_T5 -> "icons_measure_toolkit_tk_t2_t5"
        IconToken.MEASURE_TK_T5_T12 -> "icons_measure_toolkit_tk_t5_t12"
        IconToken.MEASURE_T10_L2 -> "icons_measure_toolkit_t10_l2"
        IconToken.MEASURE_LL_L1_S1 -> "icons_measure_toolkit_ll_l1_s1"
        IconToken.MEASURE_LL_L1_L4 -> "icons_measure_toolkit_ll_l1_l4"
        IconToken.MEASURE_LL_L4_S1 -> "icons_measure_toolkit_ll_l4_s1"
        IconToken.MEASURE_TPA -> "icons_measure_toolkit_tpa"
        IconToken.MEASURE_SVA -> "icons_measure_toolkit_sva"
        IconToken.MEASURE_PI -> "icons_measure_toolkit_pi"
        IconToken.MEASURE_PT -> "icons_measure_toolkit_pt"
        IconToken.MEASURE_SS -> "icons_measure_toolkit_ss"
        IconToken.MEASURE_STANDARD_DISTANCE -> "icons_measure_toolkit_standard_distance"
        IconToken.MEASURE_VERTEBRA_CENTER -> "icons_measure_toolkit_vertebra_center"
        IconToken.MEASURE_DISTANCE -> "icons_measure_toolkit_distance"
        IconToken.MEASURE_ANGLE -> "icons_measure_toolkit_angle"
        IconToken.MEASURE_AUX_CIRCLE -> "icons_measure_toolkit_aux_circle"
        IconToken.MEASURE_AUX_ELLIPSE -> "icons_measure_toolkit_aux_ellipse"
        IconToken.MEASURE_AUX_BOX -> "icons_measure_toolkit_aux_box"
        IconToken.MEASURE_AUX_ARROW -> "icons_measure_toolkit_aux_arrow"
        IconToken.MEASURE_AUX_POLYGON -> "icons_measure_toolkit_aux_polygon"
        IconToken.MEASURE_AUX_HORIZONTAL_LINE -> "icons_measure_toolkit_aux_horizontal_line"
        IconToken.MEASURE_AUX_VERTICAL_LINE -> "icons_measure_toolkit_aux_vertical_line"
    }
}
