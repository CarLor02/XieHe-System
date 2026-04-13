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
 * 标签位置方向
 */
export type LabelDirection = 'right' | 'left' | 'top' | 'bottom';

/**
 * 计算智能标签位置，避免重叠
 * @param basePosition 基础位置（已经是偏移后的初始位置）
 * @param occupiedPositions 已占用的标签位置列表
 * @param imageScale 图像缩放比例
 * @param preferredDirection 优先方向（默认右侧）
 * @returns 调整后的标签位置
 */
export function calculateSmartLabelPosition(
  basePosition: Point,
  occupiedPositions: Point[],
  imageScale: number,
  preferredDirection: LabelDirection = 'right'
): Point {
  // 如果没有已占用的位置，直接返回基础位置
  if (occupiedPositions.length === 0) {
    return basePosition;
  }

  // 根据缩放比例自适应调整偏移量
  // imageScale 越小（放大），需要更大的图像坐标偏移
  // imageScale 越大（缩小），需要更小的图像坐标偏移
  // 基准偏移量：缩放到1:1时的像素偏移
  const baseVerticalOffset = 40; // 屏幕像素
  const baseHorizontalOffset = 50; // 屏幕像素
  const baseOverlapThreshold = 90; // 屏幕像素

  const verticalOffset = baseVerticalOffset / imageScale; // 转换为图像坐标
  const horizontalOffset = baseHorizontalOffset / imageScale; // 转换为图像坐标
  const overlapThreshold = baseOverlapThreshold / imageScale; // 转换为图像坐标

  // 检查基础位置是否重叠
  let hasOverlap = false;
  for (const occupied of occupiedPositions) {
    const distance = Math.sqrt(
      Math.pow(basePosition.x - occupied.x, 2) + Math.pow(basePosition.y - occupied.y, 2)
    );
    if (distance < overlapThreshold) {
      hasOverlap = true;
      break;
    }
  }

  // 如果基础位置不重叠，直接返回
  if (!hasOverlap) {
    return basePosition;
  }

  // 定义多个候选位置（基于基础位置的微调）
  const candidates: Point[] = [
    // 上下微调
    { x: basePosition.x, y: basePosition.y - verticalOffset },
    { x: basePosition.x, y: basePosition.y + verticalOffset },
    // 左侧
    { x: basePosition.x - horizontalOffset, y: basePosition.y },
    // 上下左侧组合
    { x: basePosition.x - horizontalOffset, y: basePosition.y - verticalOffset },
    { x: basePosition.x - horizontalOffset, y: basePosition.y + verticalOffset },
    // 上下右侧组合
    { x: basePosition.x + horizontalOffset, y: basePosition.y - verticalOffset },
    { x: basePosition.x + horizontalOffset, y: basePosition.y + verticalOffset },
    // 更远的位置
    { x: basePosition.x, y: basePosition.y - verticalOffset * 2 },
    { x: basePosition.x, y: basePosition.y + verticalOffset * 2 },
  ];

  // 检查每个候选位置，找到第一个不重叠的
  for (const candidate of candidates) {
    let candidateOverlap = false;

    for (const occupied of occupiedPositions) {
      const distance = Math.sqrt(
        Math.pow(candidate.x - occupied.x, 2) + Math.pow(candidate.y - occupied.y, 2)
      );

      if (distance < overlapThreshold) {
        candidateOverlap = true;
        break;
      }
    }

    if (!candidateOverlap) {
      return candidate;
    }
  }

  // 如果所有候选位置都重叠，返回上方较远位置
  return {
    x: basePosition.x,
    y: basePosition.y - verticalOffset * 2.5,
  };
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
