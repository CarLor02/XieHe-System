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

export const LL_L1_S1_CONFIG: AnnotationConfig = {
  id: 'll-l1-s1',
  name: 'LL L1-S1',
  icon: 'ri-guide-line',
  description: '整体腰椎前凸(L1上终板与S1上终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#ea580c',
  rightSideLabel: true,

  calculateResults: COBB_THORACIC_CONFIG.calculateResults,
  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 侧面影像：锚点在第1个点旁，渲染层负责实际屏幕偏移（rightSideLabel）。
    return { x: points[0].x, y: points[0].y };
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
