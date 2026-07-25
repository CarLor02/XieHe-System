import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { calculateLateralCobbResults, isLateralCobbInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const TK_T5_T12_CONFIG: AnnotationConfig = {
  id: 'tk-t5-t12',
  name: 'TK T5-T12',
  icon: 'ri-compass-4-fill',
  description: '主胸椎后凸角(T5上终板与T12下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#c084fc',
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
