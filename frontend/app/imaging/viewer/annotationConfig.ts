/**
 * 标注配置文件
 * 统一管理所有标注类型的配置信息，包括：
 * - 标注名称、图标、描述等基本信息
 * - 所需点数
 * - 测量结果计算函数
 * - 标识位置计算函数
 * - 悬浮高亮和选中范围计算函数
 */

import React from 'react';
import * as Renderers from './annotationRenderers';

// ==================== 类型定义 ====================

export interface Point {
  x: number;
  y: number;
}

export interface MeasurementResult {
  name: string; // 测量结果名称，如 "Cobb角"
  value: string; // 测量值，如 "45.2°"
  unit: string; // 单位，如 "°" 或 "mm"
}

export interface AnnotationConfig {
  id: string; // 标注类型ID
  name: string; // 标注名称
  icon: string; // 图标类名
  description: string; // 描述
  pointsNeeded: number; // 需要的点数（0表示动态绘制，如圆形、矩形等）
  category: 'measurement' | 'auxiliary'; // 分类：测量类或辅助标注类
  color: string; // 标注颜色（十六进制色值）

  // 计算函数
  calculateResults: (
    points: Point[],
    context: CalculationContext
  ) => MeasurementResult[];

  // 标识位置计算函数（用于在图像上显示测量值的位置，图像坐标系）
  getLabelPosition: (points: Point[], imageScale: number) => Point;

  // 悬浮高亮范围计算函数（返回是否在悬浮范围内）
  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance?: number
  ) => boolean;

  // 选中范围计算函数（返回是否在选中范围内）
  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance?: number
  ) => boolean;

  // SVG渲染函数：返回SVG元素的JSX（用于特殊渲染，如参考线、弧线等）
  renderSpecialElements?: (
    points: Point[], // 屏幕坐标系中的点
    displayColor: string, // 当前显示颜色（根据选中/悬浮状态变化）
    imageScale: number // 图像缩放比例
  ) => React.ReactNode;
}

export interface CalculationContext {
  standardDistance: number | null; // 标准距离（mm）
  standardDistancePoints: Point[]; // 标准距离的两个标注点
  imageNaturalSize: { width: number; height: number } | null; // 图像原始尺寸
}

export interface RenderContext {
  imageScale: number; // 图像缩放比例
  imagePosition: Point; // 图像位置偏移
  isSelected: boolean; // 是否被选中
  isHovered: boolean; // 是否被悬浮
}

// ==================== 辅助函数 ====================

/**
 * 计算两点之间的距离
 */
export function calculateDistance2D(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算点到线段的距离
 */
export function pointToLineDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return calculateDistance2D(point, lineStart);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        lengthSquared
    )
  );
  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;

  return calculateDistance2D(point, { x: projectionX, y: projectionY });
}

/**
 * 计算两向量的夹角（度数）
 */
export function calculateAngleBetweenVectors(v1: Point, v2: Point): number {
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = dotProduct / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clampedCos) * (180 / Math.PI);
}

/**
 * 计算相对于水平线的角度
 */
export function calculateAngleToHorizontal(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 规范化到 -90 到 90 度范围
  if (angle > 90) {
    angle = angle - 180;
  } else if (angle < -90) {
    angle = angle + 180;
  }

  return angle;
}

/**
 * 使用标准距离计算实际距离
 */
export function calculateActualDistance(
  pixelDistance: number,
  context: CalculationContext
): number {
  if (context.standardDistance && context.standardDistancePoints.length === 2) {
    const standardPixelDx =
      context.standardDistancePoints[1].x - context.standardDistancePoints[0].x;
    const standardPixelDy =
      context.standardDistancePoints[1].y - context.standardDistancePoints[0].y;
    const standardPixelLength = Math.sqrt(
      standardPixelDx * standardPixelDx + standardPixelDy * standardPixelDy
    );

    return (pixelDistance / standardPixelLength) * context.standardDistance;
  }

  // 如果没有标准距离，返回默认比例计算的距离
  const defaultImageWidth = 1000;
  const defaultReferenceWidth = 300;
  return (pixelDistance / defaultImageWidth) * defaultReferenceWidth;
}

/**
 * 检查点是否接近某个点（用于悬浮检测）
 */
export function isPointNearPoint(
  mousePoint: Point,
  targetPoint: Point,
  tolerance: number = 10
): boolean {
  return calculateDistance2D(mousePoint, targetPoint) <= tolerance;
}

/**
 * 检查点是否接近某条线段（用于悬浮检测）
 */
export function isPointNearLine(
  mousePoint: Point,
  lineStart: Point,
  lineEnd: Point,
  tolerance: number = 10
): boolean {
  return pointToLineDistance(mousePoint, lineStart, lineEnd) <= tolerance;
}

/**
 * 计算多个点的中心点（用于显示标签）
 */
export function calculateCenterPoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

type PelvicMeasurementGeometry = {
  femoralHeadCenter: Point | null;
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
};

function getPelvicMeasurementGeometry(
  points: Point[]
): PelvicMeasurementGeometry | null {
  if (points.length < 2) return null;

  const femoralHeadCenter = points.length >= 3 ? points[0] : null;
  const sacralLeft = points.length >= 3 ? points[1] : points[0];
  const sacralRight = points.length >= 3 ? points[2] : points[1];
  const endplateDx = sacralRight.x - sacralLeft.x;
  const endplateDy = sacralRight.y - sacralLeft.y;
  const endplateLength = Math.sqrt(
    endplateDx * endplateDx + endplateDy * endplateDy
  );

  if (endplateLength === 0) return null;

  return {
    femoralHeadCenter,
    sacralLeft,
    sacralRight,
    sacralMidpoint: {
      x: (sacralLeft.x + sacralRight.x) / 2,
      y: (sacralLeft.y + sacralRight.y) / 2,
    },
    sacralNormal: {
      x: -endplateDy / endplateLength,
      y: endplateDx / endplateLength,
    },
  };
}

function toAcuteAngle(angle: number): number {
  return angle > 90 ? 180 - angle : angle;
}

// ==================== 标注配置定义 ====================

/**
 * T1 Tilt 椎体倾斜角（正位）
 * 2点测量：椎体上终板与水平线的夹角
 */
export const T1_TILT_CONFIG: AnnotationConfig = {
  id: 't1-tilt',
  name: 'T1 Tilt',
  icon: 'ri-focus-3-line',
  description: 'T1椎体倾斜角测量',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#8b5cf6',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'T1 Tilt',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    // 检查是否接近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否接近连线
    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return T1_TILT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderT1Tilt(points, displayColor, imageScale);
  },
};

/**
 * Cobb 通用Cobb角测量
 * 4点测量：两条终板线的夹角
 * 用于所有类型的Cobb角（胸弯、腰弯、胸腰弯等）
 */
export const COBB_CONFIG: AnnotationConfig = {
  id: 'cobb',
  name: 'Cobb',
  icon: 'ri-compass-3-line',
  description: 'Cobb角测量',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f59e0b',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 4) return [];

    // 计算第一条线的角度（点1到点2，上端椎的上边缘）
    const dx1 = points[1].x - points[0].x;
    const dy1 = points[1].y - points[0].y;
    const angle1 = Math.atan2(dy1, dx1);

    // 计算第二条线的角度（点3到点4，下端椎的下边缘）
    const dx2 = points[3].x - points[2].x;
    const dy2 = points[3].y - points[2].y;
    const angle2 = Math.atan2(dy2, dx2);

    // 计算两条线的夹角（绝对值）
    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);

    // 确保角度在0-180度范围内
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    // 判断正负：比较左右两侧的y坐标距离
    // 左边点的y距离（点1到点3）
    const leftYDistance = Math.abs(points[2].y - points[0].y);
    // 右边点的y距离（点2到点4）
    const rightYDistance = Math.abs(points[3].y - points[1].y);

    // 右凸（右边距离大）→ 正值
    // 左凸（左边距离大）→ 负值
    const signedAngle = leftYDistance > rightYDistance ? -angleDiff : angleDiff;

    return [
      {
        name: 'Cobb角',
        value: signedAngle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    return calculateCenterPoint(points);
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否接近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否接近两条线段
    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[2], points[3], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return COBB_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

// 保留旧的配置作为别名，以兼容现有代码
export const COBB_THORACIC_CONFIG = COBB_CONFIG;
export const COBB_LUMBAR_CONFIG = COBB_CONFIG;

/**
 * CA 锁骨角测量
 * 2点测量：两点连线与水平线的夹角（绝对值）
 */
export const CA_CONFIG: AnnotationConfig = {
  id: 'ca',
  name: 'CA',
  icon: 'ri-contrast-line',
  description: '锁骨角测量(Clavicle Angle)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#10b981',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const angle = Math.abs(calculateAngleToHorizontal(points[0], points[1]));

    return [
      {
        name: 'CA',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return CA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSingleLineWithHorizontal(
      points,
      displayColor,
      imageScale
    );
  },
};

/**
 * Pelvic 骨盆倾斜角
 * 2点测量：与水平线夹角
 * 正负规则：左边高为正，右边高为负
 */
export const PELVIC_CONFIG: AnnotationConfig = {
  id: 'pelvic',
  name: 'Pelvic',
  icon: 'ri-triangle-line',
  description: '骨盆倾斜角测量',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#ec4899',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    // 计算角度（图像左边高为正）
    // points[0] 是图像左侧点，points[1] 是图像右侧点
    // dx = points[1].x - points[0].x > 0（右侧x更大）
    // dy = points[1].y - points[0].y
    // 如果图像左侧高：points[0].y < points[1].y → dy > 0 → angle > 0 ✅
    // 如果图像右侧高：points[0].y > points[1].y → dy < 0 → angle < 0 ✅
    // 直接使用原始角度，不反转
    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'Pelvic',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return PELVIC_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSingleLineWithHorizontal(
      points,
      displayColor,
      imageScale
    );
  },
};

/**
 * Sacral 骶骨倾斜角
 * 2点测量：与水平线夹角
 * 正负规则：左边高为正，右边高为负
 */
export const SACRAL_CONFIG: AnnotationConfig = {
  id: 'sacral',
  name: 'Sacral',
  icon: 'ri-square-line',
  description: '骶骨倾斜角测量',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f43f5e',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    // 计算角度（图像左边高为正）
    // points[0] 是图像左侧点，points[1] 是图像右侧点
    // dx = points[1].x - points[0].x > 0（右侧x更大）
    // dy = points[1].y - points[0].y
    // 如果图像左侧高：points[0].y < points[1].y → dy > 0 → angle > 0 ✅
    // 如果图像右侧高：points[0].y > points[1].y → dy < 0 → angle < 0 ✅
    // 直接使用原始角度，不反转
    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'Sacral',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return SACRAL_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSacralWithPerpendicular(
      points,
      displayColor,
      imageScale
    );
  },
};

/**
 * AVT 顶椎平移量
 * 2点测量：两条垂直线之间的水平距离
 */
export const AVT_CONFIG: AnnotationConfig = {
  id: 'avt',
  name: 'AVT',
  icon: 'ri-focus-2-line',
  description: '顶椎平移量(Apical Vertebral Translation)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#059669',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].x - points[0].x);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: 'AVT',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: Math.min(points[0].y, points[1].y) - 20 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    // 检查是否接近垂直线（x坐标接近即可）
    return (
      Math.abs(mousePoint.x - points[0].x) <= tolerance ||
      Math.abs(mousePoint.x - points[1].x) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AVT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderVerticalLines(points, displayColor, imageScale);
  },
};

/**
 * TS 躯干偏移量
 * 2点测量：两条垂直线之间的水平距离
 */
export const TS_CONFIG: AnnotationConfig = {
  id: 'ts',
  name: 'TTS',
  icon: 'ri-crosshair-2-line',
  description: '躯干偏移量(Trunk Shift)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#84cc16',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].x - points[0].x);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: 'TTS',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: Math.min(points[0].y, points[1].y) - 20 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    return (
      Math.abs(mousePoint.x - points[0].x) <= tolerance ||
      Math.abs(mousePoint.x - points[1].x) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return TS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderVerticalLines(points, displayColor, imageScale);
  },
};

/**
 * LLD 双下肢不等长
 * 2点测量：两条水平线之间的垂直距离
 */
export const LLD_CONFIG: AnnotationConfig = {
  id: 'lld',
  name: 'LLD',
  icon: 'ri-arrow-up-down-line',
  description: '双下肢不等长',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f97316',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].y - points[0].y);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: 'LLD',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: Math.max(points[0].x, points[1].x) + 20 / imageScale,
      y: (points[0].y + points[1].y) / 2,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    return (
      Math.abs(mousePoint.y - points[0].y) <= tolerance ||
      Math.abs(mousePoint.y - points[1].y) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return LLD_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderHorizontalLines(points, displayColor, imageScale);
  },
};

/**
 * C7 Offset C7偏移距离（正面）
 * 6点测量：
 *   点1-4：C7椎体四角，中心为锥体中心
 *   点5-6：参考线两端点，中点作为参考中心
 * 测量结果：锥体中心与参考中点之间的水平距离
 */
export const C7_OFFSET_CONFIG: AnnotationConfig = {
  id: 'c7-offset',
  name: 'TS(Trunk Shift)',
  icon: 'ri-arrow-left-right-line',
  description: 'C7偏移距离（正面6点法）',
  pointsNeeded: 6,
  category: 'measurement',
  color: '#06b6d4',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 6) return [];

    // 前4个点的锥体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;

    // 后2个点的中点
    const refX = (points[4].x + points[5].x) / 2;

    const pixelDistance = Math.abs(centerX - refX);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: 'TS(Trunk Shift)',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 6) return points[0] || { x: 0, y: 0 };

    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const refX = (points[4].x + points[5].x) / 2;
    const refY = (points[4].y + points[5].y) / 2;

    return {
      x: (centerX + refX) / 2,
      y: Math.min(centerY, refY) - 20 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 6) return false;

    // 检查原始6个点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查锥体中心与参考中点
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const refX = (points[4].x + points[5].x) / 2;
    const refY = (points[4].y + points[5].y) / 2;

    return (
      isPointNearPoint(mousePoint, { x: centerX, y: centerY }, tolerance) ||
      isPointNearPoint(mousePoint, { x: refX, y: refY }, tolerance) ||
      Math.abs(mousePoint.x - centerX) <= tolerance ||
      Math.abs(mousePoint.x - refX) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return C7_OFFSET_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderC7Offset(points, displayColor, imageScale);
  },
};

/**
 * T1 Slope（侧位）
 * 2点测量：T1椎体上终板与水平线的夹角
 */
export const T1_SLOPE_CONFIG: AnnotationConfig = {
  id: 't1-slope',
  name: 'T1 Slope',
  icon: 'ri-focus-3-line',
  description: 'T1倾斜角测量（侧位）',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#a855f7',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'T1 Slope',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const minY = Math.min(points[0].y, points[1].y);
    return {
      x: (points[0].x + points[1].x) / 2,
      y: minY - 30 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return T1_SLOPE_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderT1Slope(points, displayColor, imageScale);
  },
};

/**
 * CL C2-C7前凸角
 * 4点测量：使用Cobb角算法
 */
export const CL_CONFIG: AnnotationConfig = {
  id: 'cl',
  name: 'C2-C7 CL',
  icon: 'ri-compass-3-line',
  description: 'C2-C7前凸角测量(Cervical Lordosis)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#0ea5e9',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * TK T2-T5 上胸椎后凸角
 * 4点测量：使用Cobb角算法
 */
export const TK_T2_T5_CONFIG: AnnotationConfig = {
  id: 'tk-t2-t5',
  name: 'TK T2-T5',
  icon: 'ri-compass-4-line',
  description: '上胸椎后凸角(T2上终板与T5下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#7c3aed',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * TK T5-T12 主胸椎后凸角
 * 4点测量：使用Cobb角算法
 */
export const TK_T5_T12_CONFIG: AnnotationConfig = {
  id: 'tk-t5-t12',
  name: 'TK T5-T12',
  icon: 'ri-compass-4-fill',
  description: '主胸椎后凸角(T5上终板与T12下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#9333ea',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * T10-L2 胸腰椎后凸角
 * 4点测量：使用Cobb角算法
 */
export const T10_L2_CONFIG: AnnotationConfig = {
  id: 't10-l2',
  name: 'T10-L2',
  icon: 'ri-compass-4-line',
  description: '胸腰椎后凸角(T10上终板与L2下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#a855f7',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * LL L1-S1 整体腰椎前凸
 * 4点测量：使用Cobb角算法
 */
export const LL_L1_S1_CONFIG: AnnotationConfig = {
  id: 'll-l1-s1',
  name: 'LL L1-S1',
  icon: 'ri-guide-line',
  description: '整体腰椎前凸(L1上终板与S1上终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#ea580c',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * LL L1-L4 腰椎前凸
 * 4点测量：使用Cobb角算法
 */
export const LL_L1_L4_CONFIG: AnnotationConfig = {
  id: 'll-l1-l4',
  name: 'LL L1-L4',
  icon: 'ri-guide-fill',
  description: '腰椎前凸L1-L4(L1上终板与L4下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f97316',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * LL L4-S1 腰椎前凸
 * 4点测量：使用Cobb角算法
 */
export const LL_L4_S1_CONFIG: AnnotationConfig = {
  id: 'll-l4-s1',
  name: 'LL L4-S1',
  icon: 'ri-focus-2-line',
  description: '腰椎前凸L4-S1(L4上终板与S1上终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#fb923c',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * TPA T1骨盆角
 * 4点测量：点1、点2、点3和点4中点形成的夹角
 */
export const TPA_CONFIG: AnnotationConfig = {
  id: 'tpa',
  name: 'TPA',
  icon: 'ri-triangle-line',
  description: 'T1骨盆角(T1 Pelvic Angle)',
  pointsNeeded: 7,
  category: 'measurement',
  color: '#ec4899',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 7) return [];

    // 计算前4个点的中心作为实际的第1个点
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 使用第5、6、7个点作为实际的第2、3、4个点
    const actualPoints = [
      centerPoint, // 第1个点：前4个点的中心
      points[4], // 第2个点：原第5个点
      points[5], // 第3个点：原第6个点
      points[6], // 第4个点：原第7个点
    ];

    // 计算第3和第4个点的中点
    const midPoint = {
      x: (actualPoints[2].x + actualPoints[3].x) / 2,
      y: (actualPoints[2].y + actualPoints[3].y) / 2,
    };

    // 计算从第2个点到第1个点的向量
    const v1 = {
      x: actualPoints[0].x - actualPoints[1].x,
      y: actualPoints[0].y - actualPoints[1].y,
    };

    // 计算从第2个点到中点的向量
    const v2 = {
      x: midPoint.x - actualPoints[1].x,
      y: midPoint.y - actualPoints[1].y,
    };

    const angle = calculateAngleBetweenVectors(v1, v2);

    return [
      {
        name: 'TPA',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 7) return points[0] || { x: 0, y: 0 };

    // 计算前4个点的中心作为实际的第1个点
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 第6和第7个点的中点
    const midX = (points[5].x + points[6].x) / 2;
    const midY = (points[5].y + points[6].y) / 2;

    return {
      x: (centerPoint.x + points[4].x + midX) / 3,
      y: (centerPoint.y + points[4].y + midY) / 3 - 20 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 7) return false;

    // 检查所有原始点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 计算前4个点的中心
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 第6和第7个点的中点
    const midPoint = {
      x: (points[5].x + points[6].x) / 2,
      y: (points[5].y + points[6].y) / 2,
    };

    // 检查中心点
    if (isPointNearPoint(mousePoint, centerPoint, tolerance)) return true;

    // 检查线段：中心点到第5个点，第5个点到中点
    return (
      isPointNearLine(mousePoint, points[4], centerPoint, tolerance) ||
      isPointNearLine(mousePoint, points[4], midPoint, tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return TPA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTPA(points, displayColor, imageScale);
  },
};

/**
 * SVA 矢状面垂直轴
 * 2点测量：水平距离
 */
export const SVA_CONFIG: AnnotationConfig = {
  id: 'sva',
  name: 'SVA',
  icon: 'ri-arrow-down-line',
  description: '矢状面垂直轴(Sagittal Vertical Axis)',
  pointsNeeded: 5,
  category: 'measurement',
  color: '#65a30d',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 5) return [];

    // 计算前4个点的锥体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

    // 第5个点
    const point5 = points[4];

    // 计算水平距离（只考虑X坐标）
    const pixelDistance = Math.abs(point5.x - centerX);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: 'SVA',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 5) return points[0] || { x: 0, y: 0 };

    // 计算锥体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

    // 标签显示在锥体中心和第5个点的中点，上方30像素
    const midX = (centerX + points[4].x) / 2;
    const midY = (centerY + points[4].y) / 2;

    return {
      x: midX,
      y: midY - 30 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 5) return false;

    // 检查是否靠近任何一个点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近锥体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    if (isPointNearPoint(mousePoint, { x: centerX, y: centerY }, tolerance))
      return true;

    // 检查是否靠近中心到第5个点的连线
    return isPointNearLine(
      mousePoint,
      { x: centerX, y: centerY },
      points[4],
      tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return SVA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSVA(points, displayColor, imageScale);
  },
};

/**
 * PI 骨盆入射角
 * 3点测量
 */
export const PI_CONFIG: AnnotationConfig = {
  id: 'pi',
  name: 'PI',
  icon: 'ri-compass-line',
  description: '骨盆入射角(Pelvic Incidence)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#ef4444',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 3) return [];

    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter) return [];

    const cToM = {
      x: geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x,
      y: geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y,
    };

    const angle = toAcuteAngle(
      calculateAngleBetweenVectors(cToM, geometry.sacralNormal)
    );

    return [
      {
        name: 'PI',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    return {
      x: (geometry.femoralHeadCenter.x + geometry.sacralMidpoint.x) / 2,
      y:
        (geometry.femoralHeadCenter.y + geometry.sacralMidpoint.y) / 2 -
        30 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    if (isPointNearPoint(mousePoint, geometry.sacralMidpoint, tolerance))
      return true;

    const normalLength = 80;
    const normalEnd = {
      x: geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
      y: geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
    };

    const isNearSacralLine = isPointNearLine(
      mousePoint,
      geometry.sacralLeft,
      geometry.sacralRight,
      tolerance
    );
    const isNearNormal = isPointNearLine(
      mousePoint,
      geometry.sacralMidpoint,
      normalEnd,
      tolerance
    );
    const isNearFemoralLine = geometry.femoralHeadCenter
      ? isPointNearLine(
          mousePoint,
          geometry.femoralHeadCenter,
          geometry.sacralMidpoint,
          tolerance
        )
      : false;

    return isNearSacralLine || isNearNormal || isNearFemoralLine;
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return PI_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderPI(points, displayColor, imageScale);
  },
};

/**
 * PT 骨盆倾斜角
 * 3点测量
 */
export const PT_CONFIG: AnnotationConfig = {
  id: 'pt',
  name: 'PT',
  icon: 'ri-compass-2-line',
  description: '骨盆倾斜角(Pelvic Tilt)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#f97316',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 3) return [];

    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter) return [];

    const dx = geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x;
    const dy = geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y;
    const magnitude = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
    const angle = dx < 0 ? -magnitude : magnitude;

    return [
      {
        name: 'PT',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    return {
      x: (geometry.femoralHeadCenter.x + geometry.sacralMidpoint.x) / 2,
      y:
        (geometry.femoralHeadCenter.y + geometry.sacralMidpoint.y) / 2 +
        22 / imageScale,
    };
  },

  isInHoverRange: PI_CONFIG.isInHoverRange,
  isInSelectionRange: PI_CONFIG.isInSelectionRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderPT(points, displayColor, imageScale);
  },
};

/**
 * SS 骶骨倾斜角
 * 2点测量
 */
export const SS_CONFIG: AnnotationConfig = {
  id: 'ss',
  name: 'SS',
  icon: 'ri-focus-line',
  description: '骶骨倾斜角(Sacral Slope)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f59e0b',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const angle = Math.abs(calculateAngleToHorizontal(points[0], points[1]));

    return [
      {
        name: 'SS',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };

    const minY = Math.min(points[0].y, points[1].y);
    return {
      x: (points[0].x + points[1].x) / 2,
      y: minY - 30 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return SS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSS(points, displayColor, imageScale);
  },
};

/**
 * 通用长度测量
 */
export const LENGTH_CONFIG: AnnotationConfig = {
  id: 'length',
  name: '长度测量',
  icon: 'ri-ruler-2-line',
  description: '距离测量工具',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#6366f1',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = calculateDistance2D(points[0], points[1]);
    const actualDistance = pixelDistance * 0.1; // 默认比例

    return [
      {
        name: '长度',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return LENGTH_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },
};

/**
 * 通用角度测量
 */
export const ANGLE_CONFIG: AnnotationConfig = {
  id: 'angle',
  name: '角度测量',
  icon: 'ri-compass-3-line',
  description: '通用角度测量',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#8b5cf6',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 3) return [];

    const v1 = {
      x: points[0].x - points[1].x,
      y: points[0].y - points[1].y,
    };

    const v2 = {
      x: points[2].x - points[1].x,
      y: points[2].y - points[1].y,
    };

    const angle = calculateAngleBetweenVectors(v1, v2);

    return [
      {
        name: '角度',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 3) return points[0] || { x: 0, y: 0 };
    return points[1]; // 顶点位置
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 3) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[1], points[2], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return ANGLE_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },
};

// ==================== 辅助标注配置 ====================

/**
 * 辅助圆形
 */
export const CIRCLE_CONFIG: AnnotationConfig = {
  id: 'circle',
  name: 'Auxiliary Circle',
  icon: 'ri-circle-line',
  description: '辅助圆形',
  pointsNeeded: 0, // 动态绘制，但存储圆心和边缘点两个点
  category: 'auxiliary',
  color: '#10b981',

  calculateResults: () => [],

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 放在圆心正下方，避免遮挡圆心点
    if (points.length < 1) return { x: 0, y: 0 };
    const center = points[0];
    // 如果有边缘点，计算圆的半径
    if (points.length >= 2) {
      const radius = Math.sqrt(
        Math.pow(points[1].x - center.x, 2) +
          Math.pow(points[1].y - center.y, 2)
      );
      // label 放在圆心下方，距离为半径/2 或 30 像素，取大值
      const labelDistance = Math.max(radius / 2, 30 / imageScale);
      return { x: center.x, y: center.y + labelDistance };
    }
    return center;
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    // 圆形的悬浮检测需要特殊处理
    return false; // 将在特殊逻辑中处理
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return false; // 将在特殊逻辑中处理
  },
};

/**
 * 辅助椭圆
 */
export const ELLIPSE_CONFIG: AnnotationConfig = {
  id: 'ellipse',
  name: 'Auxiliary Ellipse',
  icon: 'ri-shape-2-line',
  description: '辅助椭圆',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#14b8a6',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 放在椭圆中心正下方，避免遮挡中心点
    if (points.length < 1) return { x: 0, y: 0 };
    const center = points[0];
    // 如果有边界点，计算椭圆的半径
    if (points.length >= 2) {
      const radiusX = Math.abs(points[1].x - center.x);
      const radiusY = Math.abs(points[1].y - center.y);
      // label 放在中心下方，距离为Y半径/2 或 30 像素，取大值
      const labelDistance = Math.max(radiusY / 2, 30 / imageScale);
      return { x: center.x, y: center.y + labelDistance };
    }
    return center;
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};

/**
 * 辅助矩形
 */
export const RECTANGLE_CONFIG: AnnotationConfig = {
  id: 'rectangle',
  name: 'Auxiliary Box',
  icon: 'ri-rectangle-line',
  description: '辅助矩形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#06b6d4',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 显示在矩形上方，避免遮挡角点
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const minY = Math.min(points[0].y, points[1].y);
    const centerX = (points[0].x + points[1].x) / 2;
    return { x: centerX, y: minY - 20 / imageScale };
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};

/**
 * 箭头
 */
export const ARROW_CONFIG: AnnotationConfig = {
  id: 'arrow',
  name: 'Arrow',
  icon: 'ri-arrow-right-line',
  description: '箭头',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#f59e0b',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) =>
    points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};

/**
 * 多边形
 */
export const POLYGON_CONFIG: AnnotationConfig = {
  id: 'polygon',
  name: 'Polygons',
  icon: 'ri-shape-line',
  description: '多边形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#a855f7',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) =>
    points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};

/**
 * 锥体中心（四边形 + 中心点标注）
 */
export const VERTEBRA_CENTER_CONFIG: AnnotationConfig = {
  id: 'vertebra-center',
  name: '锥体中心',
  icon: 'ri-focus-3-line',
  description: '标注锥体中心（4个角点）',
  pointsNeeded: 4,
  category: 'auxiliary',
  color: '#10b981', // 绿色

  calculateResults: () => [],

  // 标签位置：显示在中心点上方
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };

    // 计算四边形中心点
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

    return { x: centerX, y: centerY - 20 / imageScale }; // 中心点上方20像素
  },

  // 悬浮范围：检查是否靠近四边形边界或中心点
  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否靠近中心点
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const distToCenter = calculateDistance2D(mousePoint, {
      x: centerX,
      y: centerY,
    });
    if (distToCenter <= tolerance) return true;

    // 检查是否靠近四边形的边
    for (let i = 0; i < 4; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % 4];
      const dist = pointToLineDistance(mousePoint, p1, p2);
      if (dist <= tolerance) return true;
    }

    return false;
  },

  // 选中范围：与悬浮范围相同
  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否靠近中心点
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const distToCenter = calculateDistance2D(mousePoint, {
      x: centerX,
      y: centerY,
    });
    if (distToCenter <= tolerance) return true;

    // 检查是否靠近四边形的边
    for (let i = 0; i < 4; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % 4];
      const dist = pointToLineDistance(mousePoint, p1, p2);
      if (dist <= tolerance) return true;
    }

    return false;
  },
};

/**
 * 辅助距离测量
 */
export const AUX_LENGTH_CONFIG: AnnotationConfig = {
  id: 'aux-length',
  name: '距离标注',
  icon: 'ri-ruler-2-line',
  description: '辅助距离测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#3b82f6', // 蓝色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = calculateDistance2D(points[0], points[1]);

    // 根据标准距离换算
    let actualDistance: number;
    if (
      context.standardDistance &&
      context.standardDistancePoints?.length === 2
    ) {
      const standardPixelDx =
        context.standardDistancePoints[1].x -
        context.standardDistancePoints[0].x;
      const standardPixelDy =
        context.standardDistancePoints[1].y -
        context.standardDistancePoints[0].y;
      const standardPixelLength = Math.sqrt(
        standardPixelDx * standardPixelDx + standardPixelDy * standardPixelDy
      );
      actualDistance =
        (pixelDistance / standardPixelLength) * context.standardDistance;
    } else {
      // 默认比例
      actualDistance = pixelDistance * 0.1;
    }

    return [
      {
        name: '距离',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 20 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    // 检查是否靠近端点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近线段
    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_LENGTH_CONFIG.isInHoverRange!(mousePoint, points, tolerance);
  },
};

/**
 * 辅助角度测量
 * 4点测量：两条线段的夹角（类似Cobb角）
 */
export const AUX_ANGLE_CONFIG: AnnotationConfig = {
  id: 'aux-angle',
  name: '角度标注',
  icon: 'ri-compass-3-line',
  description: '辅助角度测量（两条线段夹角）',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#8b5cf6', // 紫色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 4) return [];

    // 计算第一条线的角度（点0到点1）
    const dx1 = points[1].x - points[0].x;
    const dy1 = points[1].y - points[0].y;
    const angle1 = Math.atan2(dy1, dx1);

    // 计算第二条线的角度（点2到点3）
    const dx2 = points[3].x - points[2].x;
    const dy2 = points[3].y - points[2].y;
    const angle2 = Math.atan2(dy2, dx2);

    // 计算两条线的夹角（绝对值）
    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);

    // 确保角度在0-180度范围内
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    return [
      {
        name: '角度',
        value: angleDiff.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    return calculateCenterPoint(points);
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否靠近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近两条线段
    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[2], points[3], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_ANGLE_CONFIG.isInHoverRange!(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

/**
 * 辅助水平线：两点线段（第二点与第一点保持同一水平）
 */
export const AUX_HORIZONTAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-horizontal-line',
  name: '辅助水平线',
  icon: 'ri-minus-line',
  description: '辅助水平线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].x - points[0].x);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: '水平距离',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: points[0].y - 16 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;
    return (
      isPointNearPoint(mousePoint, points[0], tolerance) ||
      isPointNearPoint(mousePoint, points[1], tolerance) ||
      isPointNearLine(mousePoint, points[0], points[1], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_HORIZONTAL_LINE_CONFIG.isInHoverRange(
      mousePoint,
      points,
      tolerance
    );
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSingleHorizontalLine(
      points,
      displayColor,
      imageScale
    );
  },
};

/**
 * 辅助垂直线：两点线段（第二点与第一点保持同一垂直）
 */
export const AUX_VERTICAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-vertical-line',
  name: '辅助垂直线',
  icon: 'ri-sep-line',
  description: '辅助垂直线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].y - points[0].y);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: '垂直距离',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: points[0].x + 16 / imageScale,
      y: (points[0].y + points[1].y) / 2,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;
    return (
      isPointNearPoint(mousePoint, points[0], tolerance) ||
      isPointNearPoint(mousePoint, points[1], tolerance) ||
      isPointNearLine(mousePoint, points[0], points[1], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_VERTICAL_LINE_CONFIG.isInHoverRange(
      mousePoint,
      points,
      tolerance
    );
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSingleVerticalLine(points, displayColor, imageScale);
  },
};

// ==================== 配置映射表 ====================

export const ANNOTATION_CONFIGS: Record<string, AnnotationConfig> = {
  't1-tilt': T1_TILT_CONFIG,
  cobb: COBB_CONFIG,
  'cobb-thoracic': COBB_CONFIG, // 兼容旧数据
  'cobb-lumbar': COBB_CONFIG, // 兼容旧数据
  'cobb-thoracolumbar': COBB_CONFIG, // 兼容AI返回
  ca: CA_CONFIG,
  pelvic: PELVIC_CONFIG,
  sacral: SACRAL_CONFIG,
  avt: AVT_CONFIG,
  ts: TS_CONFIG,
  lld: LLD_CONFIG,
  'c7-offset': C7_OFFSET_CONFIG,
  't1-slope': T1_SLOPE_CONFIG,
  cl: CL_CONFIG,
  'c2-c7-cl': CL_CONFIG, // 'C2-C7 CL' 规范化后的别名
  'tk-t2-t5': TK_T2_T5_CONFIG,
  'tk-t5-t12': TK_T5_T12_CONFIG,
  't10-l2': T10_L2_CONFIG,
  'll-l1-s1': LL_L1_S1_CONFIG,
  'll-l1-l4': LL_L1_L4_CONFIG,
  'll-l4-s1': LL_L4_S1_CONFIG,
  tpa: TPA_CONFIG,
  sva: SVA_CONFIG,
  pi: PI_CONFIG,
  pt: PT_CONFIG,
  ss: SS_CONFIG,
  tts: TS_CONFIG, // 'TTS' 规范化后的别名
  'ts(trunk-shift)': C7_OFFSET_CONFIG, // 'TS(Trunk Shift)' 规范化后的别名
  length: LENGTH_CONFIG,
  angle: ANGLE_CONFIG,
  circle: CIRCLE_CONFIG,
  ellipse: ELLIPSE_CONFIG,
  rectangle: RECTANGLE_CONFIG,
  arrow: ARROW_CONFIG,
  polygon: POLYGON_CONFIG,
  'vertebra-center': VERTEBRA_CENTER_CONFIG,
  'aux-length': AUX_LENGTH_CONFIG,
  距离标注: AUX_LENGTH_CONFIG, // 中文别名
  'aux-angle': AUX_ANGLE_CONFIG,
  角度标注: AUX_ANGLE_CONFIG, // 中文别名
  'aux-horizontal-line': AUX_HORIZONTAL_LINE_CONFIG,
  辅助水平线: AUX_HORIZONTAL_LINE_CONFIG, // 中文别名
  'aux-vertical-line': AUX_VERTICAL_LINE_CONFIG,
  辅助垂直线: AUX_VERTICAL_LINE_CONFIG, // 中文别名
};

/**
 * 根据标注类型ID获取配置
 */
export function getAnnotationConfig(
  typeId: string
): AnnotationConfig | undefined {
  // 特殊处理：Cobb1, Cobb2, Cobb3 等都映射到 cobb 配置
  if (/^Cobb\d+$/i.test(typeId)) {
    return ANNOTATION_CONFIGS['cobb'];
  }

  // 标准化typeId：转小写并将空格替换为连字符
  const normalizedId = typeId.toLowerCase().replace(/\s+/g, '-');
  return ANNOTATION_CONFIGS[normalizedId];
}

/**
 * 获取所有测量类标注
 */
export function getMeasurementConfigs(): AnnotationConfig[] {
  return Object.values(ANNOTATION_CONFIGS).filter(
    config => config.category === 'measurement'
  );
}

/**
 * 获取所有辅助标注
 */
export function getAuxiliaryConfigs(): AnnotationConfig[] {
  return Object.values(ANNOTATION_CONFIGS).filter(
    config => config.category === 'auxiliary'
  );
}
