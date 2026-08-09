import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateLldResults,
  isLldInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/lld';
import type { Point } from '@xiehe/imaging-core/contracts';

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

  rendererId: 'horizontal-lines',
};
