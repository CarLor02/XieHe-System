import * as Renderers from '../../../components/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '../../shared/annotation-config-utils';

export const PI_CONFIG: AnnotationConfig = {
  id: 'pi',
  name: 'PI',
  icon: 'medical-pi',
  description: '骨盆入射角(Pelvic Incidence)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#ef4444',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 3) return [];

    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter) return [];

    const cToM = {
      x: geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x,
      y: geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y,
    };

    const angle = toAcuteAngle(
      calculateAngleBetweenVectors(cToM, geometry.sacralNormal)
    );

    return [
      {
        name: 'PI',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    // 标签放在测量结构右上方，避免遮挡骨盆线
    const maxX = Math.max(
      geometry.femoralHeadCenter.x,
      geometry.sacralMidpoint.x,
      ...points.map(p => p.x)
    );
    const topY = Math.min(
      geometry.femoralHeadCenter.y,
      geometry.sacralMidpoint.y
    );

    return {
      x: maxX + LABEL_OFFSET.RIGHT / imageScale,
      y: topY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    if (isPointNearPoint(mousePoint, geometry.sacralMidpoint, tolerance))
      return true;

    const normalLength = 80;
    const normalEnd = {
      x: geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
      y: geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
    };

    const isNearSacralLine = isPointNearLine(
      mousePoint,
      geometry.sacralLeft,
      geometry.sacralRight,
      tolerance
    );
    const isNearNormal = isPointNearLine(
      mousePoint,
      geometry.sacralMidpoint,
      normalEnd,
      tolerance
    );
    const isNearFemoralLine = geometry.femoralHeadCenter
      ? isPointNearLine(
          mousePoint,
          geometry.femoralHeadCenter,
          geometry.sacralMidpoint,
          tolerance
        )
      : false;

    return isNearSacralLine || isNearNormal || isNearFemoralLine;
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return PI_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderPI(points, displayColor, imageScale);
  },
};
