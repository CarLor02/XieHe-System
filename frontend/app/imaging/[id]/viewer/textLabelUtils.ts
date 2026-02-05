/**
 * 文字标注工具函数
 * 处理文字标注的位置计算、尺寸估算等
 */

import { Point } from './geometryUtils';
import { TEXT_LABEL_CONSTANTS } from './constants';
import { getLabelPositionForType } from './annotationHelpers';

export interface Measurement {
  id: string;
  type: string;
  value: string;
  points: Point[];
  description?: string;
}

/**
 * 估算文字内容的显示宽度
 * @param text 文字内容
 * @param fontSize 字体大小（像素）
 * @param padding 内边距（像素）
 * @returns 文字宽度（像素）
 */
export function estimateTextWidth(
  text: string,
  fontSize: number = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
  padding: number = TEXT_LABEL_CONSTANTS.PADDING
): number {
  return text.length * fontSize * TEXT_LABEL_CONSTANTS.CHAR_WIDTH_RATIO + padding * 2;
}

/**
 * 估算文字内容的显示高度
 * @param fontSize 字体大小（像素）
 * @param padding 内边距（像素）
 * @returns 文字高度（像素）
 */
export function estimateTextHeight(
  fontSize: number = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
  padding: number = TEXT_LABEL_CONSTANTS.PADDING
): number {
  return fontSize * TEXT_LABEL_CONSTANTS.LINE_HEIGHT_RATIO + padding * 2;
}

/**
 * 检查点是否在文字标识区域内（图像坐标系）
 * @param point 目标点（图像坐标）
 * @param measurement 测量数据
 * @param imageScale 图像缩放比例
 * @returns 是否在文字标识区域内
 */
export function isPointInTextLabel(
  point: Point,
  measurement: Measurement,
  imageScale: number
): boolean {
  // 计算测量值标注的位置和范围
  if (measurement.points.length < 2) return false;

  // 使用配置文件中的标注位置计算函数
  const { x: textX, y: textY } = getLabelPositionForType(
    measurement.type,
    measurement.points,
    imageScale
  );

  // 估算文字宽度和高度（与SVG渲染保持一致）
  const textContent = `${measurement.type}: ${measurement.value}`;
  const fontSize = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE;
  const padding = TEXT_LABEL_CONSTANTS.PADDING;

  // 在图像坐标系中，需要将屏幕像素转换为图像坐标
  const textWidth = estimateTextWidth(textContent, fontSize, padding) / imageScale;
  const textHeight = estimateTextHeight(fontSize, padding) / imageScale;

  return (
    point.x >= textX - textWidth / 2 &&
    point.x <= textX + textWidth / 2 &&
    point.y >= textY - textHeight / 2 &&
    point.y <= textY + textHeight / 2
  );
}

/**
 * 检查点是否在文字标识区域内（屏幕坐标系）
 * @param screenPoint 目标点（屏幕坐标）
 * @param labelPosition 标注位置（屏幕坐标）
 * @param textContent 文字内容
 * @param fontSize 字体大小
 * @param padding 内边距
 * @returns 是否在文字标识区域内
 */
export function isScreenPointInTextLabel(
  screenPoint: Point,
  labelPosition: Point,
  textContent: string,
  fontSize: number = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
  padding: number = TEXT_LABEL_CONSTANTS.PADDING
): boolean {
  const textWidth = estimateTextWidth(textContent, fontSize, padding);
  const textHeight = estimateTextHeight(fontSize, padding);

  const textTop = labelPosition.y - textHeight / 2;
  const textBottom = labelPosition.y + textHeight / 2;
  const textLeft = labelPosition.x - textWidth / 2;
  const textRight = labelPosition.x + textWidth / 2;

  return (
    screenPoint.x >= textLeft &&
    screenPoint.x <= textRight &&
    screenPoint.y >= textTop &&
    screenPoint.y <= textBottom
  );
}

/**
 * 获取文字标注的边界框（屏幕坐标系）
 * @param labelPosition 标注位置（屏幕坐标）
 * @param textContent 文字内容
 * @param fontSize 字体大小
 * @param padding 内边距
 * @returns 边界框 {minX, maxX, minY, maxY}
 */
export function getTextLabelBounds(
  labelPosition: Point,
  textContent: string,
  fontSize: number = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
  padding: number = TEXT_LABEL_CONSTANTS.PADDING
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const textWidth = estimateTextWidth(textContent, fontSize, padding);
  const textHeight = estimateTextHeight(fontSize, padding);

  return {
    minX: labelPosition.x - textWidth / 2,
    maxX: labelPosition.x + textWidth / 2,
    minY: labelPosition.y - textHeight / 2,
    maxY: labelPosition.y + textHeight / 2,
  };
}

/**
 * 格式化测量值文本
 * @param measurement 测量数据
 * @returns 格式化后的文本
 */
export function formatMeasurementText(measurement: Measurement): string {
  return `${measurement.type}: ${measurement.value}`;
}

