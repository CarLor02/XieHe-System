/**
 * 图像调节与默认尺寸常量。
 */
export const IMAGE_ADJUSTMENT_CONSTANTS = {
  BRIGHTNESS_MIN: -100,
  BRIGHTNESS_MAX: 100,
  BRIGHTNESS_DEFAULT: 0,
  CONTRAST_MIN: -100,
  CONTRAST_MAX: 100,
  CONTRAST_DEFAULT: 0,
  SCALE_MIN: 0.1,
  SCALE_MAX: 10,
  SCALE_DEFAULT: 1,
  ZOOM_STEP: 0.1,
} as const;

export const DEFAULT_IMAGE_SIZE = {
  WIDTH: 1000,
  HEIGHT: 1000,
  REFERENCE_WIDTH: 300,
} as const;

export const COLORS = {
  /** 选中状态颜色 */
  SELECTION: '#3b82f6',

  /** 悬浮状态颜色 */
  HOVER: '#60a5fa',

  /** 标准距离颜色 */
  STANDARD_DISTANCE: '#a855f7',

  /** 辅助图形颜色 */
  AUXILIARY: '#10b981',

  /** 测量标注颜色 */
  MEASUREMENT: '#ef4444',
} as const;

