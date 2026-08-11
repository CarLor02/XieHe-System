import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import { LABEL_OFFSET } from '@xiehe/imaging-catalog/annotations/layout';
import { calculateLengthResults } from '@xiehe/imaging-core/measurements';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const LENGTH_CONFIG: AnnotationConfig = {
  id: 'length',
  name: '长度测量',
  icon: 'ri-ruler-2-line',
  description: '距离测量工具',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#6366f1',

  calculateResults: calculateLengthResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // 标签放在线段右端点的右上方，避免遮挡线段
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return {
      x: rightPoint.x + LABEL_OFFSET.RIGHT / imageScale,
      y: rightPoint.y - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return LENGTH_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },
};
