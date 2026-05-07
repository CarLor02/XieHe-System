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
    // 标签放在线段右端点的右上方，避免遮挡线段
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return {
      x: rightPoint.x + LABEL_OFFSET.RIGHT / imageScale,
      y: rightPoint.y - LABEL_OFFSET.TOP / imageScale,
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
