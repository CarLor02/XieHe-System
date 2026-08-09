import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculatePoResults,
  isPoInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/po';
import type { Point } from '@xiehe/imaging-core/contracts';

export const PO_CONFIG: AnnotationConfig = {
  id: 'po',
  name: 'PO',
  icon: 'medical-po',
  description: '骨盆倾斜角(Pelvic obliquity, PO)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#ec4899',
  maxXRightLabel: true,

  calculateResults: calculatePoResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
  },

  isInHoverRange: isPoInRange,
  isInSelectionRange: isPoInRange,

  rendererId: 'single-line-with-horizontal',
};
