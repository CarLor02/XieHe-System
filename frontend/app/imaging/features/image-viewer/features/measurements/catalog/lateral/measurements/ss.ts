import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type Point,
  type SpecialElementRenderContext,
  LABEL_OFFSET,
  calculateAngleToHorizontal,
  isPointNearLine,
  isPointNearPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const SS_CONFIG: AnnotationConfig = {
  id: 'ss',
  name: 'SS',
  icon: 'medical-ss',
  description: '骶骨倾斜角(Sacral Slope)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f59e0b',

  calculateResults: (points: Point[]) => {
    if (points.length < 2) return [];

    const angle = Math.abs(calculateAngleToHorizontal(points[0], points[1]));

    return [
      {
        name: 'SS',
        value: angle.toFixed(2),
        unit: '°',
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
    return SS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderSS(points, displayColor, imageScale, context);
  },
};
