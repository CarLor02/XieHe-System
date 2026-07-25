import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import {
  calculateSsResults,
  isSsInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/ss';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const SS_CONFIG: AnnotationConfig = {
  id: 'ss',
  name: 'SS',
  icon: 'medical-ss',
  description: '骶骨倾斜角(Sacral Slope)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f59e0b',

  calculateResults: calculateSsResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };

    // 标签放在线段右端点的右上方，避免遮挡线段
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return {
      x: rightPoint.x + LABEL_OFFSET.RIGHT / imageScale,
      y: rightPoint.y - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: isSsInRange,
  isInSelectionRange: isSsInRange,

  rendererId: 'ss',
};
