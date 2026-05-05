/**
 * 标注配置文件
 * 统一管理所有标注类型的配置信息，包括：
 * - 标注名称、图标、描述等基本信息
 * - 所需点数
 * - 测量结果计算函数
 * - 标识位置计算函数
 * - 悬浮高亮和选中范围计算函数
 */

import type { JSX } from 'react';

// ==================== 标签位置常量 ====================

/**
 * 标签位置常量配置
 * 这些值是屏幕像素，会根据 imageScale 自动转换为图像坐标
 * 使用方法：LABEL_OFFSET.RIGHT / imageScale
 */
export const LABEL_OFFSET = {
  /** 标签右侧偏移（屏幕像素） */
  RIGHT: 50,
  /** 标签左侧偏移（屏幕像素） */
  LEFT: 50,
  /** 标签上方偏移（屏幕像素） */
  TOP: 40,
  /** 标签下方偏移（屏幕像素） */
  BOTTOM: 40,
  /** Cobb角等复杂测量的右侧偏移（屏幕像素） */
  COMPLEX_RIGHT: 60,
  /**
   * 侧面标签文字半宽估算值（屏幕像素）。
   * 侧面测量标签格式约为 "NAME: 20°"，约 14 个 ASCII 字符，
   * fontSize=11，charRatio=0.6 → textWidth ≈ 92px，半宽 ≈ 46px。
   * 用法：labelX = maxX + TEXT_HALF / imageScale
   * 效果：文字左缘恰好对齐 maxX，向右延伸，不与测量形状重叠。
   */
  TEXT_HALF: 46,
} as const;

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
  /**
   * 标签是否显示在测量右侧。
   * 为 true 时，渲染层会直接用屏幕坐标把文字左缘对齐到最右端测量点，
   * 而不是用图像坐标偏移（图像坐标偏移在小显示比例下会因 fitScale 损耗而失效）。
   */
  rightSideLabel?: boolean;
  /**
   * 正面图（AP）右侧标签模式：使用所有点的最大屏幕 X 坐标 + 实际文字半宽来定位。
   * 为 true 时，渲染层在屏幕坐标系中计算：
   *   textX = max(screenPoints.x) + textWidth/2 + gap
   * 这样文字左缘恰好从最右侧点往右 gap 像素处开始，完全由渲染时的实际文字宽度决定，
   * 不依赖 getLabelPosition 中任何固定偏移常量，也不受 fitScale 影响。
   * getLabelPosition 的 X 值用于碰撞避让估算；Y 值用于实际渲染的 Y 坐标。
   */
  maxXRightLabel?: boolean;
  /**
   * 标签是否固定在 getLabelPosition 返回的位置，不参与智能避让。
   * 为 true 时，渲染层会跳过 calculateSmartLabelPosition，把标签直接放在返回的坐标处。
   * 适用于需要精确定位的骨盆测量（PI、PT），避免标签被推离弧线位置。
   */
  fixedLabelPosition?: boolean;

  /**
   * 前 N 个点参与交互（显示圆圈、响应命中测试/拖拽）；超出的点仅用于 renderSpecialElements 渲染，
   * 不显示交互圆圈，也不参与命中测试。
   * 未设置时默认所有点均可交互。
   * 设置为 0 时，所有点均不显示圆圈（测量整体仍可通过 isInHoverRange 选中）。
   */
  interactivePointsCount?: number;

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
  ) => JSX.Element | null;
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

export type PelvicMeasurementGeometry = {
  femoralHeadCenter: Point | null;
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
};

export function getPelvicMeasurementGeometry(
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

export function toAcuteAngle(angle: number): number {
  return angle > 90 ? 180 - angle : angle;
}

export function normalizeAnnotationLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}
