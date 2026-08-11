import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import { calculateAuxiliaryHorizontalLineResults } from '@xiehe/imaging-core/measurements';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const AUX_HORIZONTAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-horizontal-line',
  name: '辅助水平线',
  icon: 'lucide-move-horizontal',
  description: '辅助水平线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: calculateAuxiliaryHorizontalLineResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: points[0].y - 16 / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;
    return (
      isPointNearPoint(mousePoint, points[0], tolerance) ||
      isPointNearPoint(mousePoint, points[1], tolerance) ||
      isPointNearLine(mousePoint, points[0], points[1], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_HORIZONTAL_LINE_CONFIG.isInHoverRange(
      mousePoint,
      points,
      tolerance
    );
  },

  rendererId: 'single-horizontal-line',
};
