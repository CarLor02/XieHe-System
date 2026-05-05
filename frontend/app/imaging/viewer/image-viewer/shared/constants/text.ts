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

  // ── 自适应字体大小（随缩放级别动态调整） ──

  /** 自适应字体大小的基础值：imageScale=1 时对应的屏幕像素大小 */
  ADAPTIVE_BASE_FONT_SIZE: 11,

  /** 悬浮状态下自适应字体大小的基础值 */
  ADAPTIVE_HOVER_BASE_FONT_SIZE: 13,

  /** 自适应字体大小下限（像素），防止缩小时标签过小不可读 */
  ADAPTIVE_MIN_FONT_SIZE: 9,

  /** 自适应字体大小上限（像素），防止放大时标签过大占满屏幕 */
  ADAPTIVE_MAX_FONT_SIZE: 20,
} as const;

/**
 * 根据当前缩放比例（imageScale）计算自适应字体大小。
 * 字体大小 = clamp(BASE * imageScale, MIN, MAX)
 *
 * @param imageScale 当前图像缩放比例（屏幕像素 / 图像像素）
 * @param isHovered  是否处于悬浮状态（使用稍大的基础值）
 * @returns 最终用于 SVG 渲染的字体大小（屏幕像素）
 */
export function getAdaptiveFontSize(
  imageScale: number,
  isHovered: boolean = false
): number {
  const base = isHovered
    ? TEXT_LABEL_CONSTANTS.ADAPTIVE_HOVER_BASE_FONT_SIZE
    : TEXT_LABEL_CONSTANTS.ADAPTIVE_BASE_FONT_SIZE;
  return Math.max(
    TEXT_LABEL_CONSTANTS.ADAPTIVE_MIN_FONT_SIZE,
    Math.min(TEXT_LABEL_CONSTANTS.ADAPTIVE_MAX_FONT_SIZE, base * imageScale)
  );
}

