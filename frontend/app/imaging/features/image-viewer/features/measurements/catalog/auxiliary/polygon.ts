import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
  LABEL_OFFSET,
  calculateActualDistance,
  calculateAngleBetweenVectors,
  calculateAngleToHorizontal,
  calculateCenterPoint,
  calculateDistance2D,
  getPelvicMeasurementGeometry,
  isPointNearLine,
  isPointNearPoint,
  pointToLineDistance,
  toAcuteAngle,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const POLYGON_CONFIG: AnnotationConfig = {
  id: 'polygon',
  name: 'Polygons',
  icon: 'ri-shape-line',
  description: '多边形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#a855f7',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) =>
    points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
