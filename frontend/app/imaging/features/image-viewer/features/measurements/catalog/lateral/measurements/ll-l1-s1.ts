import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { calculateLateralCobbResults, isLateralCobbInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const LL_L1_S1_CONFIG: AnnotationConfig = {
  id: 'll-l1-s1',
  name: 'LL L1-S1',
  icon: 'ri-guide-line',
  description: '整体腰椎前凸(L1上终板与S1上终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#ea580c',
  rightSideLabel: true,

  calculateResults: calculateLateralCobbResults,
  getLabelPosition: (points: Point[]) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 侧面影像：锚点在第1个点旁，渲染层负责实际屏幕偏移（rightSideLabel）。
    return { x: points[0].x, y: points[0].y };
  },
  isInHoverRange: isLateralCobbInRange,
  isInSelectionRange: isLateralCobbInRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};
