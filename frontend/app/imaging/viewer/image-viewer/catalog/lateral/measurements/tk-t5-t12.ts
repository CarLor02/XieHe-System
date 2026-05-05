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

export const TK_T5_T12_CONFIG: AnnotationConfig = {
  id: 'tk-t5-t12',
  name: 'TK T5-T12',
  icon: 'ri-compass-4-fill',
  description: '主胸椎后凸角(T5上终板与T12下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#9333ea',

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
