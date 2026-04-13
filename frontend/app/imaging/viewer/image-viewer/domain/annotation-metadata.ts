/**
 * 标注元信息与渲染元数据。
 * 负责颜色、描述、标签位置以及特殊 SVG 图元的纯读取逻辑。
 */

import type { JSX } from 'react';
import { Point, getAnnotationConfig } from '../catalog/annotation-catalog';
import { MeasurementData } from '../types';

const INLINE_TEXT_AUXILIARY_TYPES = new Set([
  '圆形标注',
  '椭圆标注',
  '矩形标注',
  '箭头标注',
  '多边形标注',
]);

/**
 * 根据标注类型获取描述
 */
export function getDescriptionForType(type: string): string {
  // 特殊处理：AI检测的标注（type格式：AI检测-L1-1, AI检测-CFH等）
  if (type.startsWith('AI检测-')) {
    // AI检测的标注，description字段在创建时已经设置好了
    // 这里返回type本身作为默认值
    return type;
  }

  // 特殊处理：CobbN 类型
  if (/^Cobb\d+$/i.test(type)) {
    return 'Cobb角测量';
  }

  const config = getAnnotationConfig(type);
  return config?.description || type;
}

/**
 * 根据标注类型获取颜色
 */
export function getColorForType(type: string): string {
  // AI检测点使用特殊颜色
  if (type.startsWith('AI检测-')) {
    return '#22c55e'; // 绿色 - 用于AI检测的椎骨和关键点
  }

  const config = getAnnotationConfig(type);
  return config?.color || '#10b981'; // 默认绿色
}

/**
 * 根据标注类型获取标签位置
 */
export function getLabelPositionForType(
  type: string,
  points: Point[],
  imageScale: number
): Point {
  const config = getAnnotationConfig(type);
  if (!config) {
    // 默认位置：第一个和最后一个点的中间
    if (points.length === 0) return { x: 0, y: 0 };
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    return {
      x: (firstPoint.x + lastPoint.x) / 2,
      y: (firstPoint.y + lastPoint.y) / 2 - 10 / imageScale,
    };
  }
  return config.getLabelPosition(points, imageScale);
}

/**
 * 判断是否为辅助图形
 */
export function isAuxiliaryShape(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'auxiliary';
}

/**
 * 部分辅助图形使用内嵌彩色文字 tag，而不是白底测量值标签。
 */
export function usesInlineAuxiliaryTag(type: string): boolean {
  return INLINE_TEXT_AUXILIARY_TYPES.has(type);
}

/**
 * 辅助图形优先显示 description；如果未设置，回退到类型默认描述。
 */
export function getAuxiliaryTagText(
    measurement: Pick<MeasurementData, 'type' | 'description'>
): string {
  const customText = measurement.description?.trim();
  return customText || getDescriptionForType(measurement.type);
}

/**
 * 获取 SVG 特殊渲染元素
 */
export function renderSpecialSVGElements(
  type: string,
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): JSX.Element | null {
  const config = getAnnotationConfig(type);
  if (!config || !config.renderSpecialElements) {
    return null;
  }
  return config.renderSpecialElements(screenPoints, displayColor, imageScale);
}

/**
 * 检查标注类型是否为测量类型
 */
export function isMeasurementType(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'measurement';
}

/**
 * 检查标注类型是否为辅助标注
 */
export function isAuxiliaryType(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'auxiliary';
}

/**
 * 获取标注类型的显示名称
 */
export function getDisplayName(type: string): string {
  const config = getAnnotationConfig(type);
  return config?.name || type;
}
