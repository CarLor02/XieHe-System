import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateLateralCobbResults,
  isLateralCobbInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const T10_L2_CONFIG: AnnotationConfig = {
  id: 't10-l2',
  name: 'T10-L2',
  icon: 'ri-compass-4-line',
  description: '胸腰椎后凸角(T10上终板与L2下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#e879f9',
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
