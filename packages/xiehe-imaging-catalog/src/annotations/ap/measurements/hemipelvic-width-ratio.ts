import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import {
  calculateHemipelvicWidthRatioGeometry,
  calculateHemipelvicWidthRatioResults,
  isHemipelvicWidthRatioInRange,
} from '@xiehe/imaging-core/measurements/ap';
import type { Point } from '@xiehe/imaging-core/contracts';

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

  rendererId: 'hemipelvic-width-ratio',
};
