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

export const AVT_CONFIG: AnnotationConfig = {
  id: 'avt',
  name: 'AVT',
  icon: 'ri-focus-2-line',
  description: '顶椎平移量(Apical Vertebral Translation)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#059669',
  maxXRightLabel: true,

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    // 带符号的像素距离：顶椎中心在 CSVL 右侧为正，左侧为负
    // 约定：points[0] 为顶椎中心，points[1] 为 CSVL 参考点
    const pixelOffset = points[0].x - points[1].x;
    const actualDistance = calculateActualDistance(
      Math.abs(pixelOffset),
      context
    );
    const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

    return [
      {
        name: 'AVT',
        value: signedDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // maxXRightLabel=true：渲染层用屏幕坐标计算 X，此处只需提供 Y 和碰撞避让用的估算 X。
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return {
      x: rightPoint.x + LABEL_OFFSET.RIGHT / imageScale,
      y: Math.min(points[0].y, points[1].y) - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    // 检查是否接近垂直线（x坐标接近即可）
    return (
      Math.abs(mousePoint.x - points[0].x) <= tolerance ||
      Math.abs(mousePoint.x - points[1].x) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AVT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderVerticalLines(points, displayColor, imageScale);
  },
};
