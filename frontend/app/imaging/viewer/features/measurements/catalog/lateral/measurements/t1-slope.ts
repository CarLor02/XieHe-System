import * as Renderers from '@/app/imaging/viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '@/app/imaging/viewer/features/measurements/catalog/shared/annotation-config-utils';

export const T1_SLOPE_CONFIG: AnnotationConfig = {
  id: 't1-slope',
  name: 'T1 Slope',
  icon: 'ri-focus-3-line',
  description: 'T1倾斜角测量（侧位）',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#e879f9',
  rightSideLabel: true,

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

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // 侧面影像：锚点在第1个点旁，渲染层负责实际屏幕偏移（rightSideLabel）。
    return { x: points[0].x, y: points[0].y };
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
