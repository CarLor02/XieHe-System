import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateActualDistance } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/calibration';
import {
  isPointNearLine,
  isPointNearPoint,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/hit-testing';
import type { Point } from '@xiehe/imaging-core/contracts';

export const AUX_HORIZONTAL_LINE_CONFIG: AnnotationConfig = {
  id: 'aux-horizontal-line',
  name: '辅助水平线',
  icon: 'lucide-move-horizontal',
  description: '辅助水平线段长度测量',
  pointsNeeded: 2,
  category: 'auxiliary',
  color: '#00ff00', // 绿色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelDistance = Math.abs(points[1].x - points[0].x);
    const actualDistance = calculateActualDistance(pixelDistance, context);

    return [
      {
        name: '水平距离',
        value: actualDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

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
