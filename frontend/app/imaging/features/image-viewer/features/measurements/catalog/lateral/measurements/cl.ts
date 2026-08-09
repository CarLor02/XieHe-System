import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateLateralCobbResults,
  isLateralCobbInRange,
} from '@xiehe/imaging-core/measurements/lateral';
import type { Point } from '@xiehe/imaging-core/contracts';

export const CL_CONFIG: AnnotationConfig = {
  id: 'cl',
  name: 'C2-C7 CL',
  icon: 'ri-compass-3-line',
  description: 'C2-C7前凸角测量(Cervical Lordosis)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#0ea5e9',
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
