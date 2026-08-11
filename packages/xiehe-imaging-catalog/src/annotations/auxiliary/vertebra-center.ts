import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import {
  calculateDistance2D,
  getVertebraCenterGeometry,
  pointToLineDistance,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const VERTEBRA_CENTER_CONFIG: AnnotationConfig = {
  id: 'vertebra-center',
  name: '椎体中心',
  icon: 'ri-focus-3-line',
  description: '标注椎体中心（4个角点）',
  pointsNeeded: 4,
  category: 'auxiliary',
  color: '#10b981', // 绿色

  calculateResults: () => [],

  // 标签位置：显示在中心点上方
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const center = getVertebraCenterGeometry([
      points[0],
      points[1],
      points[2],
      points[3],
    ]).center;
    return { x: center.x, y: center.y - 20 / imageScale };
  },

  // 悬浮范围：检查是否靠近四边形边界或中心点
  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;
    const geometry = getVertebraCenterGeometry([
      points[0],
      points[1],
      points[2],
      points[3],
    ]);
    const distToCenter = calculateDistance2D(mousePoint, geometry.center);
    if (distToCenter <= tolerance) return true;

    const lines = [
      ...geometry.perimeter.map(
        (point, index) =>
          [
            point,
            geometry.perimeter[(index + 1) % geometry.perimeter.length],
          ] as const
      ),
      geometry.topBottomMidline,
      geometry.leftRightMidline,
    ];
    return lines.some(
      ([start, end]) => pointToLineDistance(mousePoint, start, end) <= tolerance
    );
  },

  // 选中范围：与悬浮范围相同
  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;
    return VERTEBRA_CENTER_CONFIG.isInHoverRange!(
      mousePoint,
      points,
      tolerance
    );
  },
};
