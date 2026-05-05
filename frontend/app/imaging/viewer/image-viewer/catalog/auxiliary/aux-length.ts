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

export const AUX_LENGTH_CONFIG: AnnotationConfig = {
  id: 'aux-length',
  name: '距离标注',
  icon: 'medical-aux-length',
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
    // 标签放在线段右端点的右上方，避免遮挡距离线
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
