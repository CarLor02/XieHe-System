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

export const CSS_CONFIG: AnnotationConfig = {
  id: 'css',
  name: 'CSS',
  icon: 'medical-css',
  description: '冠状面骶骨倾斜角CSS(Coronal Sacral Slope)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#f43f5e',
  maxXRightLabel: true,

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    // 计算角度（图像左边高为正）
    // points[0] 是图像左侧点，points[1] 是图像右侧点
    // dx = points[1].x - points[0].x > 0（右侧x更大）
    // dy = points[1].y - points[0].y
    // 如果图像左侧高：points[0].y < points[1].y → dy > 0 → angle > 0 ✅
    // 如果图像右侧高：points[0].y > points[1].y → dy < 0 → angle < 0 ✅
    // 直接使用原始角度，不反转
    const angle = calculateAngleToHorizontal(points[0], points[1]);

    return [
      {
        name: 'CSS',
        value: angle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // maxXRightLabel=true：渲染层用屏幕坐标计算 X，此处只需提供 Y 和碰撞避让用的估算 X。
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return {
      x: rightPoint.x + LABEL_OFFSET.RIGHT / imageScale,
      y: rightPoint.y,
    };
  },

  isInHoverRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 10
  ) => {
    if (points.length < 2) return false;

    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    return isPointNearLine(mousePoint, points[0], points[1], tolerance);
  },

  isInSelectionRange: (
    mousePoint: Point,
    points: Point[],
    tolerance: number = 15
  ) => {
    return CSS_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderSacralWithPerpendicular(
      points,
      displayColor,
      imageScale
    );
  },
};
