import * as Renderers from '../../components/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
  LABEL_OFFSET,
  calculateActualDistance,
  calculateAngleBetweenVectors,
  calculateAngleToHorizontal,
  calculateCenterPoint,
  calculateDistance2D,
  getPelvicMeasurementGeometry,
  isPointNearLine,
  isPointNearPoint,
  pointToLineDistance,
  toAcuteAngle,
} from '../shared/annotation-config-utils';

export const VERTEBRA_CENTER_CONFIG: AnnotationConfig = {
  id: 'vertebra-center',
  name: '椎体中心',
  icon: 'ri-focus-3-line',
  description: '标注椎体中心（4个角点）',
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
