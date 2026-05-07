import * as Renderers from '@/app/imaging/viewer/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '@/app/imaging/viewer/image-viewer/features/measurements/catalog/shared/annotation-config-utils';
import { COBB_THORACIC_CONFIG } from '../../ap/measurements/cobb';

export const LL_L1_L4_CONFIG: AnnotationConfig = {
  id: 'll-l1-l4',
  name: 'LL L1-L4',
  icon: 'ri-guide-fill',
  description: '腰椎前凸L1-L4(L1上终板与L4下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f97316',
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
