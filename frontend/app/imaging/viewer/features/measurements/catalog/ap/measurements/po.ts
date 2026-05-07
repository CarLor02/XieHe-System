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

export const PO_CONFIG: AnnotationConfig = {
  id: 'po',
  name: 'PO',
  icon: 'medical-po',
  description: '骨盆倾斜角(Pelvic obliquity, PO)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#ec4899',
  maxXRightLabel: true,

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    // 计算角度（图像左边高为正）
    // points[0] 是图像左侧点，points[1] 是图像右侧点
    // dx = points[1].x - points[0].x > 0（右侧x更大）
    // dy = points[1].y - points[0].y
    // 如果图像左侧高：points[0].y < points[1].y → dy > 0 → angle > 0 ✅
    // 如果图像右侧高：points[0].y > points[1].y → dy < 0 → angle < 0 ✅
    // 直接使用原始角度，不反转
    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'PO',
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
    return PO_CONFIG.isInHoverRange(mousePoint, points, tolerance);
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
