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

export const TTS_CONFIG: AnnotationConfig = {
  id: 'tts',
  name: 'TTS',
  icon: 'medical-tts',
  description: '胸廓躯干偏移TTS(Thoracic Trunk Shift)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#84cc16',
  maxXRightLabel: true,

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

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const trunkMidX = (points[0].x + points[1].x) / 2;
    const trunkMidY = (points[0].y + points[1].y) / 2;
    const sacralMidX = (points[2].x + points[3].x) / 2;
    const sacralMidY = (points[2].y + points[3].y) / 2;
    // maxXRightLabel=true：渲染层用 labelPosition.x（屏幕坐标）做锚点，
    // 文字左缘 = screen(X) + gap + textWidth/2。
    // 此处 X 只需返回连接箭头右端（两条线中点的较大 X），
    // 而不是躯干线最右端点（会让标签跑到图像最右边）。
    return {
      x: Math.max(trunkMidX, sacralMidX),
      y: (trunkMidY + sacralMidY) / 2,
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
