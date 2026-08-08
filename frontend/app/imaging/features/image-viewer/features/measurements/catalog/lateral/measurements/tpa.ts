import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import {
  calculateTpaResults,
  getTpaGeometry,
  isTpaInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/tpa';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const TPA_CONFIG: AnnotationConfig = {
  id: 'tpa',
  name: 'TPA',
  icon: 'medical-tpa',
  description: 'T1骨盆角(T1 Pelvic Angle)',
  pointsNeeded: 7,
  category: 'measurement',
  color: '#ec4899',

  calculateResults: calculateTpaResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 7) return points[0] || { x: 0, y: 0 };
    const geometry = getTpaGeometry(points);
    if (!geometry) return points[0];

    // 标签放在所有点的右上方，避免遮挡角度线
    const maxX = Math.max(...points.map(point => point.x));
    const topY = Math.min(
      geometry.t1Center.y,
      geometry.femoralHeadCenter.y,
      geometry.sacralMidpoint.y
    );

    return {
      x: maxX + LABEL_OFFSET.RIGHT / imageScale,
      y: topY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: isTpaInRange,
  isInSelectionRange: isTpaInRange,

  rendererId: 'tpa',
};
