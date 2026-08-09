import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import {
  calculateSvaResults,
  isSvaInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/sva';
import type { Point } from '@xiehe/imaging-core/contracts';

export const SVA_CONFIG: AnnotationConfig = {
  id: 'sva',
  name: 'SVA',
  icon: 'medical-sva',
  description: '矢状面垂直轴(Sagittal Vertical Axis)',
  pointsNeeded: 5,
  category: 'measurement',
  color: '#65a30d',

  calculateResults: calculateSvaResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 5) return points[0] || { x: 0, y: 0 };

    // 标签显示在所有点的右上方，避免遮挡椎体
    const maxX = Math.max(
      points[0].x,
      points[1].x,
      points[2].x,
      points[3].x,
      points[4].x
    );
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);

    return {
      x: maxX + LABEL_OFFSET.RIGHT / imageScale,
      y: minY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: isSvaInRange,
  isInSelectionRange: isSvaInRange,

  rendererId: 'sva',
};
