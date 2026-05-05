import * as Renderers from '../../../components/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
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
  maxXRightLabel: true,
  apLabelGapX: 24, // T1锥体框比单点宽，额外推远标签（默认 8px）

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

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length >= 2 && points.length < 6) {
      // 2点模式：锚点在右侧端点，渲染层用 AP_LABEL_GAP 加固定间距
      const rightPoint = points[0].x >= points[1].x ? points[0] : points[1];
      return { x: rightPoint.x, y: rightPoint.y };
    }

    if (points.length < 6) return points[0] || { x: 0, y: 0 };

    // 6点模式：锚点 = T1锥体（前4点）最右 X，Y 取 T1 中心。
    // 仅用前4点（角点），避免骶骨参考点（points[4..5]）导致锚点跳变。
    const box = points.slice(0, 4);
    const maxX = Math.max(...box.map(p => p.x));
    const centerY = (box[0].y + box[1].y + box[2].y + box[3].y) / 4;
    return { x: maxX, y: centerY };
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
