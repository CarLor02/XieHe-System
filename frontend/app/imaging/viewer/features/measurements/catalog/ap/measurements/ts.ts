import * as Renderers from '@/app/imaging/viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '@/app/imaging/viewer/features/measurements/catalog/shared/annotation-config-utils';

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
  fixedLabelPosition: true, // 固定在锥体右侧，不参与智能避让（避免被 T1 Tilt 标签推走）

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

    // 6点模式：[tl(0), tr(1), bl(2), br(3), SR(4), SL(5)]
    // 锚点 X = 4个T1角点中最大的 X（T1锥体右边缘）
    // 锚点 Y = 4个T1角点 Y 的均值（T1锥体垂直中心）
    // 使用4个角点均值而非仅右侧两点，使锚点对角点顺序不敏感，避免跳动
    // fixedLabelPosition:true 保证不被智能避让推走
    const boxPoints = [points[0], points[1], points[2], points[3]];
    const maxX = Math.max(...boxPoints.map(p => p.x));
    const centerY = boxPoints.reduce((sum, p) => sum + p.y, 0) / 4;
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
