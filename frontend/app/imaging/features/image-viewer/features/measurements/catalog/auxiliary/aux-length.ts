import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import { calculateAuxiliaryLengthResults } from '@xiehe/imaging-core/measurements';
import { isPointNearLine, isPointNearPoint } from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const AUX_LENGTH_CONFIG: AnnotationConfig = {
  id: 'aux-length',
  name: '距离标注',
  icon: 'medical-aux-length',
  description: '辅助距离测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#3b82f6', // 蓝色

  calculateResults: calculateAuxiliaryLengthResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // 标签放在线段右端点的右上方，避免遮挡距离线
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

    // 检查是否靠近端点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近线段
    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_LENGTH_CONFIG.isInHoverRange!(mousePoint, points, tolerance);
  },
};
