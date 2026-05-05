import * as Renderers from '../../components/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '../shared/annotation-config-utils';

export const ARROW_CONFIG: AnnotationConfig = {
  id: 'arrow',
  name: 'Arrow',
  icon: 'ri-arrow-right-line',
  description: '箭头',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#f59e0b',

  calculateResults: () => [],
  getLabelPosition: (points: Point[], imageScale: number = 1) =>
    points[0] || { x: 0, y: 0 },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
