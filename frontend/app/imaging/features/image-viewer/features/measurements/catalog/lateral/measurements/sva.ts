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

export const SVA_CONFIG: AnnotationConfig = {
  id: 'sva',
  name: 'SVA',
  icon: 'medical-sva',
  description: '矢状面垂直轴(Sagittal Vertical Axis)',
  pointsNeeded: 5,
  category: 'measurement',
  color: '#65a30d',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 5) return [];

    // 计算前4个点的C7椎体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;

    // 第5个点：骶椎后缘参考点
    const point5 = points[4];

    // 计算水平距离（带正负）
    // 正值：C7中点在骶椎后缘左侧（centerX < point5.x）
    // 负值：C7中点在骶椎后缘右侧（centerX > point5.x）
    const pixelDistance = point5.x - centerX;
    const actualDistance = calculateActualDistance(
      Math.abs(pixelDistance),
      context
    );
    const signedDistance = pixelDistance > 0 ? actualDistance : -actualDistance;

    return [
      {
        name: 'SVA',
        value: signedDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 5) return points[0] || { x: 0, y: 0 };

    // 计算椎体中心Y坐标
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

    // 标签显示在所有点的右上方，避免遮挡椎体
    const maxX = Math.max(
      points[0].x,
      points[1].x,
      points[2].x,
      points[3].x,
      points[4].x
    );
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);

    return {
      x: maxX + LABEL_OFFSET.RIGHT / imageScale,
      y: minY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 5) return false;

    // 检查是否靠近任何一个点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近椎体中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    if (isPointNearPoint(mousePoint, { x: centerX, y: centerY }, tolerance))
      return true;

    // 检查是否靠近中心到第5个点的连线
    return isPointNearLine(
      mousePoint,
      { x: centerX, y: centerY },
      points[4],
      tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return SVA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSVA(points, displayColor, imageScale);
  },
};
