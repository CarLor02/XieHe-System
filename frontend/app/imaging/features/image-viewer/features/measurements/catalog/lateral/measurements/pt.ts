import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type Point,
  type SpecialElementRenderContext,
  getPelvicMeasurementGeometry,
  isPointNearLine,
  isPointNearPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const PT_CONFIG: AnnotationConfig = {
  id: 'pt',
  name: 'PT',
  icon: 'medical-pt',
  description: '骨盆倾斜角(Pelvic Tilt)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#f97316',
  fixedLabelPosition: true,

  calculateResults: (points: Point[]) => {
    if (points.length < 3) return [];

    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter) return [];

    const dx = geometry.sacralMidpoint.x - geometry.femoralHeadCenter.x;
    const dy = geometry.sacralMidpoint.y - geometry.femoralHeadCenter.y;
    const magnitude = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
    const angle = dx < 0 ? -magnitude : magnitude;

    return [
      {
        name: 'PT',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[]) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    // 标签锚点在股骨头中心（弧顶点），renderMeasurement 用 textAnchor="middle" 居中显示
    return geometry.femoralHeadCenter;
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

    const isNearSacralLine = isPointNearLine(
      mousePoint,
      geometry.sacralLeft,
      geometry.sacralRight,
      tolerance
    );
    if (!geometry.femoralHeadCenter) return isNearSacralLine;

    const verticalLength = 80;
    const verticalTop = {
      x: geometry.femoralHeadCenter.x,
      y: geometry.femoralHeadCenter.y - verticalLength,
    };
    const verticalBottom = {
      x: geometry.femoralHeadCenter.x,
      y: geometry.femoralHeadCenter.y + verticalLength,
    };
    const isNearCfhVertical = isPointNearLine(
      mousePoint,
      verticalTop,
      verticalBottom,
      tolerance
    );
    const isNearFemoralLine = isPointNearLine(
      mousePoint,
      geometry.femoralHeadCenter,
      geometry.sacralMidpoint,
      tolerance
    );

    return isNearSacralLine || isNearCfhVertical || isNearFemoralLine;
  },
  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return PT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderPT(points, displayColor, imageScale, context);
  },
};
