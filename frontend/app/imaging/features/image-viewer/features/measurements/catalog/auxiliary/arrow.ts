import {
  type AnnotationConfig,
  type Point,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const ARROW_CONFIG: AnnotationConfig = {
  id: 'arrow',
  name: 'Arrow',
  icon: 'ri-arrow-right-line',
  description: '箭头',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#f59e0b',

  calculateResults: () => [],

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // 标签放在箭头线中点上方
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 - 15 / imageScale,
    };
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
