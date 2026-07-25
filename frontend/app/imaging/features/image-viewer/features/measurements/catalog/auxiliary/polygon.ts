import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const POLYGON_CONFIG: AnnotationConfig = {
  id: 'polygon',
  name: 'Polygons',
  icon: 'ri-shape-line',
  description: '多边形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#a855f7',

  calculateResults: () => [],
  getLabelPosition: (points: Point[]) =>
    points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
