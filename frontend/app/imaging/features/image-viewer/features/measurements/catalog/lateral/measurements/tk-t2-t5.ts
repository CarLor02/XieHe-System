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
import { COBB_THORACIC_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/cobb';

export const TK_T2_T5_CONFIG: AnnotationConfig = {
  id: 'tk-t2-t5',
  name: 'TK T2-T5',
  icon: 'ri-compass-4-line',
  description: '上胸椎后凸角(T2上终板与T5下终板)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#a78bfa',
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
