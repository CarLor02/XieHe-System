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

export const ELLIPSE_CONFIG: AnnotationConfig = {
  id: 'ellipse',
  name: 'Auxiliary Ellipse',
  icon: 'ri-shape-2-line',
  description: '辅助椭圆',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#14b8a6',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 放在椭圆中心正下方，避免遮挡中心点
    if (points.length < 1) return { x: 0, y: 0 };
    const center = points[0];
    if (points.length >= 2) {
      const radiusX = Math.abs(points[1].x - center.x);
      const radiusY = Math.abs(points[1].y - center.y);
      // label 放在中心下方，距离为Y半径/2 或 30 像素，取大值
      const labelDistance = Math.max(radiusY / 2, 30 / imageScale);
      return { x: center.x, y: center.y + labelDistance };
    }
    return center;
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
