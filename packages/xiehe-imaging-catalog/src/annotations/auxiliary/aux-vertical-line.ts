import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import { calculateAuxiliaryVerticalLineResults } from '@xiehe/imaging-core/measurements';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const AUX_VERTICAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-vertical-line',
  name: '辅助垂直线',
  icon: 'lucide-move-vertical',
  description: '辅助垂直线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: calculateAuxiliaryVerticalLineResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    return {
      x: points[0].x + 16 / imageScale,
      y: (points[0].y + points[1].y) / 2,
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
    return AUX_VERTICAL_LINE_CONFIG.isInHoverRange(
      mousePoint,
      points,
      tolerance
    );
  },

  rendererId: 'single-vertical-line',
};

// ==================== 配置映射表 ====================
