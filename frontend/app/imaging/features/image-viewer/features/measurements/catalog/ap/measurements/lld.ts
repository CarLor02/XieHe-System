import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig, SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { calculateLldResults, isLldInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/lld';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const LLD_CONFIG: AnnotationConfig = {
  id: 'lld',
  name: 'LLD',
  icon: 'ri-arrow-up-down-line',
  description: '双下肢不等长',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f97316',
  maxXRightLabel: true,

  calculateResults: calculateLldResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: Math.max(points[0].x, points[1].x),
      y: (points[0].y + points[1].y) / 2,
    };
  },

  isInHoverRange: isLldInRange,
  isInSelectionRange: isLldInRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderHorizontalLines(
      points,
      displayColor,
      imageScale,
      context
    );
  },
};
