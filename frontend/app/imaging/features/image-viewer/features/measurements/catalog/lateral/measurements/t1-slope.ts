import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateT1SlopeResults,
  isT1SlopeInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/t1-slope';
import type { Point } from '@xiehe/imaging-core/contracts';

export const T1_SLOPE_CONFIG: AnnotationConfig = {
  id: 't1-slope',
  name: 'T1 Slope',
  icon: 'ri-focus-3-line',
  description: 'T1倾斜角测量（侧位）',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#e879f9',
  rightSideLabel: true,

  calculateResults: calculateT1SlopeResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // 侧面影像：锚点在第1个点旁，渲染层负责实际屏幕偏移（rightSideLabel）。
    return { x: points[0].x, y: points[0].y };
  },

  isInHoverRange: isT1SlopeInRange,
  isInSelectionRange: isT1SlopeInRange,

  rendererId: 't1-slope',
};
