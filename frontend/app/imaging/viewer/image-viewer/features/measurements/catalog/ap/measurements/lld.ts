import * as Renderers from '@/app/imaging/viewer/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '@/app/imaging/viewer/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const LLD_CONFIG: AnnotationConfig = {
  id: 'lld',
  name: 'LLD',
  icon: 'ri-arrow-up-down-line',
  description: '双下肢不等长',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f97316',
  maxXRightLabel: true,

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

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: Math.max(points[0].x, points[1].x),
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
