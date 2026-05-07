import * as Renderers from '@/app/imaging/viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
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
} from '@/app/imaging/viewer/features/measurements/catalog/shared/annotation-config-utils';

export const AUX_ANGLE_CONFIG: AnnotationConfig = {
  id: 'aux-angle',
  name: '角度标注',
  icon: 'medical-aux-angle-4',
  description: '辅助角度测量（两条线段夹角）',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#8b5cf6', // 紫色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 4) return [];

    // 计算第一条线的角度（点0到点1）
    const dx1 = points[1].x - points[0].x;
    const dy1 = points[1].y - points[0].y;
    const angle1 = Math.atan2(dy1, dx1);

    // 计算第二条线的角度（点2到点3）
    const dx2 = points[3].x - points[2].x;
    const dy2 = points[3].y - points[2].y;
    const angle2 = Math.atan2(dy2, dx2);

    // 计算两条线的夹角（绝对值）
    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);

    // 确保角度在0-180度范围内
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    return [
      {
        name: '角度',
        value: angleDiff.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 标签放在所有点的右上方，避免遮挡角度线
    const maxX = Math.max(points[0].x, points[1].x, points[2].x, points[3].x);
    const minY = Math.min(points[0].y, points[1].y, points[2].y, points[3].y);
    return {
      x: maxX + LABEL_OFFSET.COMPLEX_RIGHT / imageScale,
      y: minY - LABEL_OFFSET.TOP / imageScale,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 4) return false;

    // 检查是否靠近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否靠近两条线段
    return (
      isPointNearLine(mousePoint, points[0], points[1], tolerance) ||
      isPointNearLine(mousePoint, points[2], points[3], tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return AUX_ANGLE_CONFIG.isInHoverRange!(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};
