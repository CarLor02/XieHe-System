import * as Renderers from '../../../components/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '../../shared/annotation-config-utils';
import { COBB_THORACIC_CONFIG } from '../../ap/measurements/cobb';

export const TK_T2_T5_CONFIG: AnnotationConfig = {
  id: 'tk-t2-t5',
  name: 'TK T2-T5',
  icon: 'ri-compass-4-line',
  description: '上胸椎后凸角(T2上终板与T5下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#7c3aed',

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return { x: centerX, y: minY - 40 / imageScale };
  },
  isInHoverRange: COBB_THORACIC_CONFIG.isInHoverRange,
  isInSelectionRange: COBB_THORACIC_CONFIG.isInSelectionRange,
  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};
