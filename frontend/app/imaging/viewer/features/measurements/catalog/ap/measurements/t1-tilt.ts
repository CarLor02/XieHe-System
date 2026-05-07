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

export const T1_TILT_CONFIG: AnnotationConfig = {
  id: 't1-tilt',
  name: 'T1 Tilt',
  icon: 'ri-focus-3-line',
  description: 'T1椎体倾斜角测量',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#8b5cf6',
  maxXRightLabel: true,

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

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
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
