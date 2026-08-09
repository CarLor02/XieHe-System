import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateCssResults,
  isCssInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/css';
import type { Point } from '@xiehe/imaging-core/contracts';

export const CSS_CONFIG: AnnotationConfig = {
  id: 'css',
  name: 'CSS',
  icon: 'medical-css',
  description: '冠状面骶骨倾斜角CSS(Coronal Sacral Slope)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f43f5e',
  maxXRightLabel: true,

  calculateResults: calculateCssResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
  },

  isInHoverRange: isCssInRange,
  isInSelectionRange: isCssInRange,

  rendererId: 'sacral-with-perpendicular',
};
