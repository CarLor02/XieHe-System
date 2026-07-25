import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateActualDistance } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/calibration';
import { calculateDistance2D } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/geometry';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const CIRCLE_CONFIG: AnnotationConfig = {
  id: 'circle',
  name: 'Auxiliary Circle',
  icon: 'ri-circle-line',
  description: '辅助圆形',
  pointsNeeded: 0, // 动态绘制，但存储圆心和边缘点两个点
  category: 'auxiliary',
  color: '#10b981',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];
    const pixelRadius = calculateDistance2D(points[0], points[1]);
    const actualRadius = calculateActualDistance(pixelRadius, context);
    return [{ name: '半径', value: actualRadius.toFixed(1), unit: 'mm' }];
  },

  getLabelPosition: (points: Point[]) => {
    // label 放在圆的左侧，水平对齐圆心
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const center = points[0];
    const radius = calculateDistance2D(center, points[1]);
    return { x: center.x - radius, y: center.y };
  },

  // 圆形命中由画布图形命中模块处理，catalog 不重复实现。
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
