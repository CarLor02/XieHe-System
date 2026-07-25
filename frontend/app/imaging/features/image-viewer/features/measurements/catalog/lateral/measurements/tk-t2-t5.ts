import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { calculateLateralCobbResults, isLateralCobbInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const TK_T2_T5_CONFIG: AnnotationConfig = {
  id: 'tk-t2-t5',
  name: 'TK T2-T5',
  icon: 'ri-compass-4-line',
  description: '上胸椎后凸角(T2上终板与T5下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#a78bfa',
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
