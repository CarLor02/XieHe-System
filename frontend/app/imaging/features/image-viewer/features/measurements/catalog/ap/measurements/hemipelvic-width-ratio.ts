import { renderHemipelvicWidthRatio } from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/renderHemipelvicWidthRatio';
import {
  type AnnotationConfig,
  type Point,
  type SpecialElementRenderContext,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';
import { calculateHemipelvicWidthRatioGeometry } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

export const HEMIPELVIC_WIDTH_RATIO_CONFIG: AnnotationConfig = {
  id: 'hemipelvic-width-ratio',
  name: 'L/R',
  icon: 'ri-ruler-2-line',
  description: '半骨盆宽度比(L/R)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#06b6d4',
  maxXRightLabel: true,
  showPointLabels: false,
  preserveCanvasValue: true,

  calculateResults: (points: Point[]) => {
    const geometry = calculateHemipelvicWidthRatioGeometry(points);
    if (!geometry) return [];

    return [
      {
        name: 'L/R',
        value: geometry.ratio === null ? '--' : geometry.ratio.toFixed(2),
        unit: '',
      },
    ];
  },

  getLabelPosition: (points: Point[]) => {
    const geometry = calculateHemipelvicWidthRatioGeometry(points);
    if (!geometry) return points[0] ?? { x: 0, y: 0 };

    const rightLine = geometry.lines[geometry.lines.length - 1];
    return {
      x: rightLine.anchor.x,
      y: rightLine.anchor.y,
    };
  },

  isInHoverRange: (mousePoint: Point, points: Point[], tolerance = 10) => {
    const geometry = calculateHemipelvicWidthRatioGeometry(points);
    if (!geometry) return false;

    return geometry.lines.some(line => {
      const minY = Math.min(line.top.y, line.bottom.y) - tolerance;
      const maxY = Math.max(line.top.y, line.bottom.y) + tolerance;
      return (
        Math.abs(mousePoint.x - line.anchor.x) <= tolerance &&
        mousePoint.y >= minY &&
        mousePoint.y <= maxY
      );
    });
  },

  isInSelectionRange: (mousePoint: Point, points: Point[], tolerance = 15) =>
    HEMIPELVIC_WIDTH_RATIO_CONFIG.isInHoverRange(mousePoint, points, tolerance),

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale = 1,
    context?: SpecialElementRenderContext
  ) =>
    renderHemipelvicWidthRatio(points, displayColor, imageScale, context),
};
