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

export const TTS_CONFIG: AnnotationConfig = {
  id: 'tts',
  name: 'TTS',
  icon: 'medical-tts',
  description: '胸廓躯干偏移TTS(Thoracic Trunk Shift)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#84cc16',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 4) return [];

    // 躯干线中点 X（点0-1）
    const trunkMidX = (points[0].x + points[1].x) / 2;
    // 骶骨线中点 X（点2-3，继承自 Sacral）
    const sacralMidX = (points[2].x + points[3].x) / 2;

    // 带符号的像素距离：躯干线中点在骶骨中点左侧时为负
    const pixelOffset = trunkMidX - sacralMidX;
    const actualDistance = calculateActualDistance(
      Math.abs(pixelOffset),
      context
    );
    const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

    return [
      {
        name: 'TTS',
        value: signedDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const trunkMidX = (points[0].x + points[1].x) / 2;
    const trunkMidY = (points[0].y + points[1].y) / 2;
    const sacralMidX = (points[2].x + points[3].x) / 2;
    const sacralMidY = (points[2].y + points[3].y) / 2;
    // 标签放在测量区域右上方，避免遮挡线段
    const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
    const topY = Math.min(trunkMidY, sacralMidY);
    return {
      x: maxX + LABEL_OFFSET.RIGHT / imageScale,
      y: topY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 1) return false;
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }
    if (points.length >= 2) {
      const trunkMidX = (points[0].x + points[1].x) / 2;
      if (Math.abs(mousePoint.x - trunkMidX) <= tolerance) return true;
    }
    if (points.length >= 4) {
      const sacralMidX = (points[2].x + points[3].x) / 2;
      if (Math.abs(mousePoint.x - sacralMidX) <= tolerance) return true;
    }
    return false;
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return TTS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTTS(points, displayColor, imageScale);
  },
};
