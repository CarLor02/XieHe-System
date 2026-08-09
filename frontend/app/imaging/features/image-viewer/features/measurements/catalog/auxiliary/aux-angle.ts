import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@xiehe/imaging-core/geometry';
import { calculateAuxiliaryAngleResults } from '@xiehe/imaging-core/measurements';
import type { Point } from '@xiehe/imaging-core/contracts';

export const AUX_ANGLE_CONFIG: AnnotationConfig = {
  id: 'aux-angle',
  name: '角度标注',
  icon: 'medical-aux-angle-4',
  description: '辅助角度测量（两条线段夹角）',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#8b5cf6', // 紫色

  calculateResults: calculateAuxiliaryAngleResults,

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 标签放在所有点的右上方，避免遮挡角度线
    const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return {
      x: maxX + LABEL_OFFSET.COMPLEX_RIGHT / imageScale,
      y: minY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否靠近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近两条线段
    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[2], points[3], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_ANGLE_CONFIG.isInHoverRange!(mousePoint, points, tolerance);
  },

  rendererId: 'two-lines',
};
