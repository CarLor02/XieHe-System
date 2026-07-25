import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateLateralCobbResults,
  isLateralCobbInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const LL_L1_L4_CONFIG: AnnotationConfig = {
  id: 'll-l1-l4',
  name: 'LL L1-L4',
  icon: 'ri-guide-fill',
  description: '腰椎前凸L1-L4(L1上终板与L4下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f97316',
  rightSideLabel: true,

  calculateResults: calculateLateralCobbResults,
  getLabelPosition: (points: Point[]) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 侧面影像：锚点在第1个点旁，渲染层负责实际屏幕偏移（rightSideLabel）。
    return { x: points[0].x, y: points[0].y };
  },
  isInHoverRange: isLateralCobbInRange,
  isInSelectionRange: isLateralCobbInRange,
  rendererId: 'two-lines',
};
