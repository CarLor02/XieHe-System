/**
 * 标注工具辅助函数
 * 用于简化ImageViewer.tsx中的标注相关逻辑
 */

import React from 'react';
import {
  AnnotationConfig,
  Point,
  CalculationContext,
  getAnnotationConfig,
  ANNOTATION_CONFIGS
} from './annotationConfig';

/**
 * 根据标注类型和点位计算测量值
 */
export function calculateMeasurementValue(
  type: string,
  points: Point[],
  context: CalculationContext
): string {
  const config = getAnnotationConfig(type);
  
  if (!config) {
    return '辅助标注';
  }
  
  const results = config.calculateResults(points, context);
  
  if (results.length === 0) {
    return '辅助标注';
  }
  
  // 如果有多个测量结果，返回第一个
  return `${results[0].value}${results[0].unit}`;
}

/**
 * 根据标注类型获取描述
 */
export function getDescriptionForType(type: string): string {
  const config = getAnnotationConfig(type);
  return config?.description || type;
}

/**
 * 根据标注类型获取颜色
 */
export function getColorForType(type: string): string {
  const config = getAnnotationConfig(type);
  return config?.color || '#10b981'; // 默认绿色
}

/**
 * 根据标注类型获取标签位置
 */
export function getLabelPositionForType(type: string, points: Point[], imageScale: number): Point {
  const config = getAnnotationConfig(type);
  if (!config) {
    // 默认位置：第一个和最后一个点的中间
    if (points.length === 0) return { x: 0, y: 0 };
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    return {
      x: (firstPoint.x + lastPoint.x) / 2,
      y: (firstPoint.y + lastPoint.y) / 2 - 10 / imageScale
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
 * 获取SVG特殊渲染元素
 */
export function renderSpecialSVGElements(
  type: string,
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode | null {
  const config = getAnnotationConfig(type);
  if (!config || !config.renderSpecialElements) {
    return null;
  }
  return config.renderSpecialElements(screenPoints, displayColor, imageScale);
}

/**
 * 根据标注类型获取所需点数
 */
export function getPointsNeededForType(type: string): number {
  const config = getAnnotationConfig(type);
  return config?.pointsNeeded || 0;
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

/**
 * 生成默认测量值（用于创建新标注时）
 */
export function generateDefaultValue(
  type: string,
  points: Point[],
  context: CalculationContext
): string {
  const config = getAnnotationConfig(type);
  
  if (!config) {
    return '辅助标注';
  }
  
  if (config.category === 'auxiliary') {
    return '辅助标注';
  }
  
  // 如果点数不足，返回默认值
  if (points.length < config.pointsNeeded) {
    const results = config.calculateResults([], context);
    if (results.length > 0) {
      return `${results[0].value}${results[0].unit}`;
    }
    return '0.0°';
  }
  
  // 计算实际值
  const results = config.calculateResults(points, context);
  if (results.length > 0) {
    return `${results[0].value}${results[0].unit}`;
  }
  
  return '0.0°';
}

/**
 * 获取正位X光片的工具列表
 */
export function getAnteriorTools() {
  return [
    't1-tilt',
    'cobb',
    'ca',
    'pelvic',
    'sacral',
    'avt',
    'ts',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

/**
 * 获取侧位X光片的工具列表
 */
export function getLateralTools() {
  return [
    't1-slope',
    'cl',
    'tk-t2-t5',
    'tk-t5-t12',
    'll-l1-s1',
    'll-l1-l4',
    'll-l4-s1',
    'tpa',
    'sva',
    'pi',
    'pt',
    'ss',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

/**
 * 获取通用工具列表
 */
export function getGenericTools() {
  return [
    'length',
    'angle',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

/**
 * 根据检查类型获取工具列表
 */
export function getToolsForExamType(examType: string) {
  if (examType === '正位X光片') {
    return getAnteriorTools();
  } else if (examType === '侧位X光片') {
    return getLateralTools();
  } else {
    return getGenericTools();
  }
}
