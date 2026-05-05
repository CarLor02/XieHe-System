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

  calculateResults: () => [],

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 放在圆心正下方，避免遮挡圆心点
    if (points.length < 1) return { x: 0, y: 0 };
    const center = points[0];
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
