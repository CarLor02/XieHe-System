/**
 * 文字标注渲染常量。
 */
export const TEXT_LABEL_CONSTANTS = {
  /** 默认字体大小（像素，用于文字宽高估算） */
  DEFAULT_FONT_SIZE: 14,

  /** 悬浮时字体大小（像素，用于文字宽高估算） */
  HOVER_FONT_SIZE: 16,

  /** 文字内边距（像素） */
  PADDING: 4,

  /** 字符宽度估算系数 */
  CHAR_WIDTH_RATIO: 0.6,

  /** 行高系数 */
  LINE_HEIGHT_RATIO: 1.4,
} as const;

export { getAdaptiveFontSize } from '@xiehe/imaging-catalog/annotations/layout';
