package com.xiehe.spine.ui.theme

import androidx.compose.ui.graphics.Color

private val annotationToolPalette = SpineAnnotationToolColors(
    t1Tilt = Color(0xFF8B5CF6),
    cobb = Color(0xFFF59E0B),
    ca = Color(0xFF10B981),
    pelvic = Color(0xFFEC4899),
    sacral = Color(0xFFF43F5E),
    avt = Color(0xFF059669),
    ts = Color(0xFF84CC16),
    lld = Color(0xFFF97316),
    c7Offset = Color(0xFF06B6D4),
    t1Slope = Color(0xFFA855F7),
    cl = Color(0xFF0EA5E9),
    tkT2T5 = Color(0xFF7C3AED),
    tkT5T12 = Color(0xFF9333EA),
    t10L2 = Color(0xFFA855F7),
    llL1S1 = Color(0xFFEA580C),
    llL1L4 = Color(0xFFF97316),
    llL4S1 = Color(0xFFFB923C),
    tpa = Color(0xFFEC4899),
    sva = Color(0xFF65A30D),
    pi = Color(0xFFEF4444),
    pt = Color(0xFFF97316),
    ss = Color(0xFFF59E0B),
    length = Color(0xFF6366F1),
    angle = Color(0xFF8B5CF6),
    auxiliaryCircle = Color(0xFF10B981),
    auxiliaryEllipse = Color(0xFF14B8A6),
    auxiliaryBox = Color(0xFF06B6D4),
    auxiliaryArrow = Color(0xFFF59E0B),
    auxiliaryPolygon = Color(0xFFA855F7),
    vertebraCenter = Color(0xFF10B981),
    auxiliaryLength = Color(0xFF3B82F6),
    auxiliaryAngle = Color(0xFF8B5CF6),
    auxiliaryHorizontalLine = Color(0xFF00FF00),
    auxiliaryVerticalLine = Color(0xFF00FF00),
    detectedPoint = Color(0xFF22C55E),
    helperGuide = Color(0xFF00FF00),
    draft = Color(0xFFEF4444),
    labelBackground = Color(0xCC0B1220),
)

internal fun lightPalette(brand: AppThemeBrandColor): SpineAppColors {
    val primary = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFF7C3AED)
        AppThemeBrandColor.BLUE -> Color(0xFF2563EB)
        AppThemeBrandColor.GREEN -> Color(0xFF059669)
    }
    val primaryMuted = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFFEDE9FE)
        AppThemeBrandColor.BLUE -> Color(0xFFDBEAFE)
        AppThemeBrandColor.GREEN -> Color(0xFFD1FAE5)
    }
    val headerHighlight = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFFA855F7)
        AppThemeBrandColor.BLUE -> Color(0xFF38BDF8)
        AppThemeBrandColor.GREEN -> Color(0xFF14B8A6)
    }
    val examCategories = SpineExamCategoryColors(
        front = SpineExamCategoryStyle(
            background = Color(0xFFDBEAFE),
            content = Color(0xFF1D4ED8),
            accentStart = Color(0xFF60A5FA),
            accentEnd = Color(0xFF2563EB),
        ),
        side = SpineExamCategoryStyle(
            background = Color(0xFFFFEDD5),
            content = Color(0xFFEA580C),
            accentStart = Color(0xFFFB923C),
            accentEnd = Color(0xFFF59E0B),
        ),
        leftBending = SpineExamCategoryStyle(
            background = Color(0xFFD1FAE5),
            content = Color(0xFF059669),
            accentStart = Color(0xFF34D399),
            accentEnd = Color(0xFF10B981),
        ),
        rightBending = SpineExamCategoryStyle(
            background = Color(0xFFEDE9FE),
            content = Color(0xFF7C3AED),
            accentStart = Color(0xFFA78BFA),
            accentEnd = Color(0xFF8B5CF6),
        ),
        posturePhoto = SpineExamCategoryStyle(
            background = Color(0xFFFCE7F3),
            content = Color(0xFFDB2777),
            accentStart = Color(0xFFF472B6),
            accentEnd = Color(0xFFEC4899),
        ),
    )

    return SpineAppColors(
        isDark = false,
        primary = primary,
        onPrimary = Color(0xFFFFFFFF),
        primaryMuted = primaryMuted,
        headerHighlight = headerHighlight,
        background = Color(0xFFF8FAFC),
        backgroundElevated = Color(0xFFF1F5F9),
        surface = Color(0xFFFFFFFF),
        surfaceMuted = Color(0xFFF8FAFC),
        borderSubtle = Color(0xFFE2E8F0),
        borderStrong = Color(0xFFCBD5E1),
        textPrimary = Color(0xFF0F172A),
        textSecondary = Color(0xFF475569),
        textTertiary = Color(0xFF94A3B8),
        success = Color(0xFF10B981),
        warning = Color(0xFFF97316),
        error = Color(0xFFEF4444),
        destructive = Color(0xFFDC2626),
        destructiveMuted = Color(0xFFFEE2E2),
        info = Color(0xFF0EA5E9),
        tabInactive = Color(0xFF94A3B8),
        examCategories = examCategories,
        annotationTools = annotationToolPalette,
    )
}

internal fun darkPalette(brand: AppThemeBrandColor): SpineAppColors {
    val primary = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFF8B5CF6)
        AppThemeBrandColor.BLUE -> Color(0xFF3B82F6)
        AppThemeBrandColor.GREEN -> Color(0xFF10B981)
    }
    val primaryMuted = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFF312049)
        AppThemeBrandColor.BLUE -> Color(0xFF172554)
        AppThemeBrandColor.GREEN -> Color(0xFF052E2B)
    }
    val headerHighlight = when (brand) {
        AppThemeBrandColor.PURPLE -> Color(0xFFC084FC)
        AppThemeBrandColor.BLUE -> Color(0xFF7DD3FC)
        AppThemeBrandColor.GREEN -> Color(0xFF5EEAD4)
    }
    val examCategories = SpineExamCategoryColors(
        front = SpineExamCategoryStyle(
            background = Color(0xFF1E3A8A),
            content = Color(0xFFBFDBFE),
            accentStart = Color(0xFF60A5FA),
            accentEnd = Color(0xFF3B82F6),
        ),
        side = SpineExamCategoryStyle(
            background = Color(0xFF7C2D12),
            content = Color(0xFFFED7AA),
            accentStart = Color(0xFFFB923C),
            accentEnd = Color(0xFFF59E0B),
        ),
        leftBending = SpineExamCategoryStyle(
            background = Color(0xFF064E3B),
            content = Color(0xFFA7F3D0),
            accentStart = Color(0xFF34D399),
            accentEnd = Color(0xFF10B981),
        ),
        rightBending = SpineExamCategoryStyle(
            background = Color(0xFF4C1D95),
            content = Color(0xFFDDD6FE),
            accentStart = Color(0xFFC084FC),
            accentEnd = Color(0xFF8B5CF6),
        ),
        posturePhoto = SpineExamCategoryStyle(
            background = Color(0xFF831843),
            content = Color(0xFFFBCFE8),
            accentStart = Color(0xFFF472B6),
            accentEnd = Color(0xFFEC4899),
        ),
    )

    return SpineAppColors(
        isDark = true,
        primary = primary,
        onPrimary = Color(0xFFFFFFFF),
        primaryMuted = primaryMuted,
        headerHighlight = headerHighlight,
        background = Color(0xFF020617),
        backgroundElevated = Color(0xFF0F172A),
        surface = Color(0xFF111827),
        surfaceMuted = Color(0xFF0F172A),
        borderSubtle = Color(0xFF1F2937),
        borderStrong = Color(0xFF334155),
        textPrimary = Color(0xFFF8FAFC),
        textSecondary = Color(0xFFCBD5E1),
        textTertiary = Color(0xFF94A3B8),
        success = Color(0xFF34D399),
        warning = Color(0xFFFB923C),
        error = Color(0xFFF87171),
        destructive = Color(0xFFFCA5A5),
        destructiveMuted = Color(0xFF450A0A),
        info = Color(0xFF38BDF8),
        tabInactive = Color(0xFF94A3B8),
        examCategories = examCategories,
        annotationTools = annotationToolPalette,
    )
}

fun previewBrandPrimaryColor(
    brand: AppThemeBrandColor,
    isDark: Boolean,
): Color = if (isDark) darkPalette(brand).primary else lightPalette(brand).primary
