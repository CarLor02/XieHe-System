import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import type { Point } from '@xiehe/imaging-core/contracts';

export const POLYGON_CONFIG: AnnotationConfig = {
  id: 'polygon',
  name: 'Polygons',
  icon: 'ri-shape-line',
  description: '多边形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#a855f7',

  calculateResults: () => [],
  getLabelPosition: (points: Point[]) => points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
