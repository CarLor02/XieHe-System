import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import { calculateAngleBetweenVectors } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';
import { isPointNearLine, isPointNearPoint } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const ANGLE_CONFIG: AnnotationConfig = {
  id: 'angle',
  name: '角度测量',
  icon: 'ri-compass-3-line',
  description: '通用角度测量',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#8b5cf6',

  calculateResults: (points: Point[]) => {
    if (points.length < 3) return [];

    const v1 = {
      x: points[0].x - points[1].x,
      y: points[0].y - points[1].y,
    };

    const v2 = {
      x: points[2].x - points[1].x,
      y: points[2].y - points[1].y,
    };

    const angle = calculateAngleBetweenVectors(v1, v2);

    return [
      {
        name: '角度',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

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
