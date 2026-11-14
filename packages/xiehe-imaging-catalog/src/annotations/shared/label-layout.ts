/**
 * Catalog 使用的标签屏幕偏移量。
 *
 * 数值属于展示策略，不应被领域计算引用。
 */
export const LABEL_OFFSET = {
  RIGHT: 50,
  LEFT: 50,
  TOP: 40,
  BOTTOM: 40,
  COMPLEX_RIGHT: 60,
  TEXT_HALF: 46,
} as const;

/** 缩放时调整数值标签的屏幕字号，同时保证两端的可读范围一致。 */
export function getAdaptiveFontSize(
  imageScale: number,
  isHovered = false
): number {
  return Math.max(9, Math.min(20, (isHovered ? 13 : 11) * imageScale));
}
