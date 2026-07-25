import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import { calculateApCobbResults, isApCobbInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/cobb';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const COBB_CONFIG: AnnotationConfig = {
  id: 'cobb',
  name: 'Cobb',
  icon: 'medical-cobb',
  description: 'Cobb角测量',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f59e0b', // 橙色

  calculateResults: calculateApCobbResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 找到最右侧的点，标签放在右上方，避免遮挡线段
    const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return {
      x: maxX + LABEL_OFFSET.COMPLEX_RIGHT / imageScale,
      y: minY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: isApCobbInRange,
  isInSelectionRange: isApCobbInRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

export const COBB1_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb1',
  name: 'Cobb1',
  description: 'Cobb角1测量',
  color: '#3b82f6', // 蓝色
};

/**
 * Cobb2 第二个Cobb角（紫色）
 */
export const COBB2_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb2',
  name: 'Cobb2',
  description: 'Cobb角2测量',
  color: '#a855f7', // 紫色
};

/**
 * Cobb3 第三个Cobb角（粉色）
 */
export const COBB3_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb3',
  name: 'Cobb3',
  description: 'Cobb角3测量',
  color: '#ec4899', // 粉色
};
