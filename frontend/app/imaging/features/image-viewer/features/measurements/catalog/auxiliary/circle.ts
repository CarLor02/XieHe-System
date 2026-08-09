import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { calculateActualDistance } from '@xiehe/imaging-core/measurements';
import {
  circleGeometryFromPoints,
  getCircleRadius,
} from '@xiehe/imaging-core/geometry';
import type { Point } from '@xiehe/imaging-core/contracts';

export const CIRCLE_CONFIG: AnnotationConfig = {
  id: 'circle',
  name: 'Auxiliary Circle',
  icon: 'ri-circle-line',
  description: '辅助圆形',
  pointsNeeded: 0, // 动态绘制，但存储圆心和边缘点两个点
  category: 'auxiliary',
  color: '#10b981',

  calculateResults: (points: Point[], context: CalculationContext) => {
    const circle = circleGeometryFromPoints(points);
    if (!circle) return [];
    const pixelRadius = getCircleRadius(circle);
    const actualRadius = calculateActualDistance(pixelRadius, context);
    return [{ name: '半径', value: actualRadius.toFixed(1), unit: 'mm' }];
  },

  getLabelPosition: (points: Point[]) => {
    // label 放在圆的左侧，水平对齐圆心
    const circle = circleGeometryFromPoints(points);
    if (!circle) return points[0] || { x: 0, y: 0 };
    return {
      x: circle.center.x - getCircleRadius(circle),
      y: circle.center.y,
    };
  },

  // 圆形命中由画布图形命中模块处理，catalog 不重复实现。
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
