import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
  type SpecialElementRenderContext,
  calculateActualDistance,
  isPointNearLine,
  isPointNearPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const AUX_VERTICAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-vertical-line',
  name: '辅助垂直线',
  icon: 'ri-sep-line',
  description: '辅助垂直线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].y - points[0].y);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: '垂直距离',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: points[0].x + 16 / imageScale,
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
    return AUX_VERTICAL_LINE_CONFIG.isInHoverRange(
      mousePoint,
      points,
      tolerance
    );
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderSingleVerticalLine(
      points,
      displayColor,
      imageScale,
      context
    );
  },
};

// ==================== 配置映射表 ====================
