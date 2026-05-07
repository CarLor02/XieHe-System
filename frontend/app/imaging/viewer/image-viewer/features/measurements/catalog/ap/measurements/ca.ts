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

export const CA_CONFIG: AnnotationConfig = {
  id: 'ca',
  name: 'CA',
  icon: 'ri-contrast-line',
  description: '锁骨角测量(Clavicle Angle)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#10b981',
  maxXRightLabel: true,

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const angle = Math.abs(calculateAngleToHorizontal(points[0], points[1]));

    return [
      {
        name: 'CA',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // maxXRightLabel=true：渲染层在屏幕坐标系统一加 AP_LABEL_GAP + textWidth/2。
    // 此处只返回右侧端点（无额外偏移），避免双重累加导致缩小时间距过大。
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
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
    return CA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSingleLineWithHorizontal(
      points,
      displayColor,
      imageScale
    );
  },
};
