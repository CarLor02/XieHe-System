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

export const CIRCLE_CONFIG: AnnotationConfig = {
  id: 'circle',
  name: 'Auxiliary Circle',
  icon: 'ri-circle-line',
  description: '辅助圆形',
  pointsNeeded: 0, // 动态绘制，但存储圆心和边缘点两个点
  category: 'auxiliary',
  color: '#10b981',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];
    const pixelRadius = calculateDistance2D(points[0], points[1]);
    const actualRadius = calculateActualDistance(pixelRadius, context);
    return [{ name: '半径', value: actualRadius.toFixed(1), unit: 'mm' }];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 放在圆的左侧，水平对齐圆心
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const center = points[0];
    const radius = calculateDistance2D(center, points[1]);
    return { x: center.x - radius, y: center.y };
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
