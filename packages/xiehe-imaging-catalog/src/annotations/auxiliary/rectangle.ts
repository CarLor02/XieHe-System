import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import { calculateRectangleResults } from '@xiehe/imaging-core/measurements';
import type { Point } from '@xiehe/imaging-core/contracts';

export const RECTANGLE_CONFIG: AnnotationConfig = {
  id: 'rectangle',
  name: 'Auxiliary Box',
  icon: 'ri-rectangle-line',
  description: '辅助矩形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#06b6d4',

  calculateResults: calculateRectangleResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 显示在矩形上方，避免遮挡角点
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const minY = Math.min(points[0].y, points[1].y);
    const centerX = (points[0].x + points[1].x) / 2;
    return { x: centerX, y: minY - 20 / imageScale };
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
