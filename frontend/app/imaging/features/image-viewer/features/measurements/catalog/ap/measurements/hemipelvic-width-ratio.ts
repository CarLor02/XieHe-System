import { renderHemipelvicWidthRatio } from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/renderHemipelvicWidthRatio';
import type { AnnotationConfig, SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateHemipelvicWidthRatioGeometry,
  calculateHemipelvicWidthRatioResults,
  isHemipelvicWidthRatioInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

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

  calculateResults: calculateHemipelvicWidthRatioResults,

  getLabelPosition: (points: Point[]) => {
    const geometry = calculateHemipelvicWidthRatioGeometry(points);
    if (!geometry) return points[0] ?? { x: 0, y: 0 };

    const rightLine = geometry.lines[geometry.lines.length - 1];
    return {
      x: rightLine.anchor.x,
      y: rightLine.anchor.y,
    };
  },

  isInHoverRange: isHemipelvicWidthRatioInRange,
  isInSelectionRange: isHemipelvicWidthRatioInRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale = 1,
    context?: SpecialElementRenderContext
  ) =>
    renderHemipelvicWidthRatio(points, displayColor, imageScale, context),
};
