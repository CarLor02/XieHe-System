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

export const TPA_CONFIG: AnnotationConfig = {
  id: 'tpa',
  name: 'TPA',
  icon: 'medical-tpa',
  description: 'T1骨盆角(T1 Pelvic Angle)',
  pointsNeeded: 7,
  category: 'measurement',
  color: '#ec4899',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 7) return [];

    // 计算前4个点的中心作为实际的第1个点
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 使用第5、6、7个点作为实际的第2、3、4个点
    const actualPoints = [
      centerPoint, // 第1个点：前4个点的中心
      points[4], // 第2个点：原第5个点
      points[5], // 第3个点：原第6个点
      points[6], // 第4个点：原第7个点
    ];

    // 计算第3和第4个点的中点
    const midPoint = {
      x: (actualPoints[2].x + actualPoints[3].x) / 2,
      y: (actualPoints[2].y + actualPoints[3].y) / 2,
    };

    // 计算从第2个点到第1个点的向量
    const v1 = {
      x: actualPoints[0].x - actualPoints[1].x,
      y: actualPoints[0].y - actualPoints[1].y,
    };

    // 计算从第2个点到中点的向量
    const v2 = {
      x: midPoint.x - actualPoints[1].x,
      y: midPoint.y - actualPoints[1].y,
    };

    const angle = calculateAngleBetweenVectors(v1, v2);

    return [
      {
        name: 'TPA',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 7) return points[0] || { x: 0, y: 0 };

    // 计算前4个点的中心作为实际的第1个点
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 第6和第7个点的中点
    const midY = (points[5].y + points[6].y) / 2;

    // 标签放在所有点的右上方，避免遮挡角度线
    const maxX = Math.max(
      points[0].x,
      points[1].x,
      points[2].x,
      points[3].x,
      points[4].x,
      points[5].x,
      points[6].x
    );
    const topY = Math.min(centerPoint.y, points[4].y, midY);

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
    if (points.length < 7) return false;

    // 检查所有原始点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 计算前4个点的中心
    const centerPoint = {
      x: (points[0].x + points[1].x + points[2].x + points[3].x) / 4,
      y: (points[0].y + points[1].y + points[2].y + points[3].y) / 4,
    };

    // 第6和第7个点的中点
    const midPoint = {
      x: (points[5].x + points[6].x) / 2,
      y: (points[5].y + points[6].y) / 2,
    };

    // 检查中心点
    if (isPointNearPoint(mousePoint, centerPoint, tolerance)) return true;

    // 检查线段：中心点到第5个点，第5个点到中点
    return (
      isPointNearLine(mousePoint, points[4], centerPoint, tolerance) ||
      isPointNearLine(mousePoint, points[4], midPoint, tolerance)
    );
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return TPA_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTPA(points, displayColor, imageScale);
  },
};
