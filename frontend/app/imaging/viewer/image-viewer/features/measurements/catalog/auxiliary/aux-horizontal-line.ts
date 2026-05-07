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
