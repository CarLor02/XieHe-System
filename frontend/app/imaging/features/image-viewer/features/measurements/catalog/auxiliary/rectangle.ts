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

export const RECTANGLE_CONFIG: AnnotationConfig = {
  id: 'rectangle',
  name: 'Auxiliary Box',
  icon: 'ri-rectangle-line',
  description: '辅助矩形',
  pointsNeeded: 0,
  category: 'auxiliary',
  color: '#06b6d4',

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    const pixelW = Math.abs(points[1].x - points[0].x);
    const pixelH = Math.abs(points[1].y - points[0].y);

    // 根据标准距离换算
    let scale: number;
    if (
      context.standardDistance &&
      context.standardDistancePoints?.length === 2
    ) {
      const sdx =
        context.standardDistancePoints[1].x -
        context.standardDistancePoints[0].x;
      const sdy =
        context.standardDistancePoints[1].y -
        context.standardDistancePoints[0].y;
      const stdPx = Math.sqrt(sdx * sdx + sdy * sdy);
      scale = stdPx > 0 ? context.standardDistance / stdPx : 0.1;
    } else {
      scale = 0.1;
    }

    const w = (pixelW * scale).toFixed(1);
    const h = (pixelH * scale).toFixed(1);
    return [{ name: '尺寸', value: `${w} × ${h}`, unit: 'mm' }];
  },
  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    // label 显示在矩形上方，避免遮挡角点
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    const minY = Math.min(points[0].y, points[1].y);
    const centerX = (points[0].x + points[1].x) / 2;
    return { x: centerX, y: minY - 20 / imageScale };
  },
  isInHoverRange: () => false,
  isInSelectionRange: () => false,
};
