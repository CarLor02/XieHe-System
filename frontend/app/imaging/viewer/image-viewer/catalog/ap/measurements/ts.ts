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

export const TS_CONFIG: AnnotationConfig = {
  id: 'ts',
  name: 'TS',
  icon: 'medical-ts',
  description: '躯干偏移TS(Trunk Shift)',
  pointsNeeded: 6,
  category: 'measurement',
  color: '#06b6d4',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length >= 2 && points.length < 6) {
      // 带符号的像素距离：C7 中心在 CSVL 右侧为正，左侧为负
      // 约定：points[0] 为 C7 中心，points[1] 为 CSVL 参考点
      const pixelOffset = points[0].x - points[1].x;
      const actualDistance = calculateActualDistance(
        Math.abs(pixelOffset),
        context
      );
      const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

      return [
        {
          name: 'TS',
          value: signedDistance.toFixed(2),
          unit: 'mm',
        },
      ];
    }

    if (points.length < 6) return [];

    // 前4个点的椎体（C7）中心
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;

    // 后2个点（骶骨参考线）的中点
    const refX = (points[4].x + points[5].x) / 2;

    // 带符号的像素距离：C7中心在骶骨中点左侧时为负
    const pixelOffset = centerX - refX;
    const actualDistance = calculateActualDistance(
      Math.abs(pixelOffset),
      context
    );
    const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

    return [
      {
        name: 'TS',
        value: signedDistance.toFixed(2),
        unit: 'mm',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length >= 2 && points.length < 6) {
      return {
        x: Math.max(points[0].x, points[1].x) + LABEL_OFFSET.RIGHT / imageScale,
        y: Math.min(points[0].y, points[1].y) - LABEL_OFFSET.TOP / imageScale,
      };
    }

    if (points.length < 6) return points[0] || { x: 0, y: 0 };

    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const refY = (points[4].y + points[5].y) / 2;

    // 标签放在所有点的右上方，避免遮挡椎体和线段
    const maxX = Math.max(
      points[0].x,
      points[1].x,
      points[2].x,
      points[3].x,
      points[4].x,
      points[5].x
    );
    const topY = Math.min(centerY, refY);

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
    if (points.length >= 2 && points.length < 6) {
      return (
        isPointNearPoint(mousePoint, points[0], tolerance) ||
        isPointNearPoint(mousePoint, points[1], tolerance) ||
        isPointNearLine(mousePoint, points[0], points[1], tolerance)
      );
    }

    if (points.length < 6) return false;

    // 检查原始6个点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查椎体中心与参考中点
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const refX = (points[4].x + points[5].x) / 2;
    const refY = (points[4].y + points[5].y) / 2;

    return (
      isPointNearPoint(mousePoint, { x: centerX, y: centerY }, tolerance) ||
      isPointNearPoint(mousePoint, { x: refX, y: refY }, tolerance) ||
      Math.abs(mousePoint.x - centerX) <= tolerance ||
      Math.abs(mousePoint.x - refX) <= tolerance
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return TS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderC7Offset(points, displayColor, imageScale);
  },
};
