import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import { calculateAngleResults } from '@xiehe/imaging-core/measurements';
import { isPointNearLine, isPointNearPoint } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const ANGLE_CONFIG: AnnotationConfig = {
  id: 'angle',
  name: '角度测量',
  icon: 'ri-compass-3-line',
  description: '通用角度测量',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#8b5cf6',

  calculateResults: calculateAngleResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 3) return points[0] || { x: 0, y: 0 };
    // 标签放在顶点右上方，避免遮挡角度顶点
    return {
      x: points[1].x + LABEL_OFFSET.RIGHT / imageScale,
      y: points[1].y - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 3) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[1], points[2], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return ANGLE_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },
};

// ==================== 辅助标注配置 ====================
