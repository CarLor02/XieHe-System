import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateT1TiltResults,
  isT1TiltInRange,
} from '@xiehe/imaging-core/measurements/ap';
import type { Point } from '@xiehe/imaging-core/contracts';

export const T1_TILT_CONFIG: AnnotationConfig = {
  id: 't1-tilt',
  name: 'T1 Tilt',
  icon: 'ri-focus-3-line',
  description: 'T1椎体倾斜角测量',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#8b5cf6',
  maxXRightLabel: true,

  calculateResults: calculateT1TiltResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
  },

  isInHoverRange: isT1TiltInRange,
  isInSelectionRange: isT1TiltInRange,

  rendererId: 't1-tilt',
};
