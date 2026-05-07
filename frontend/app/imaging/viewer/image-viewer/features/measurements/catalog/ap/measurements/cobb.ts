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

export const COBB_CONFIG: AnnotationConfig = {
  id: 'cobb',
  name: 'Cobb',
  icon: 'medical-cobb',
  description: 'Cobb角测量',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#f59e0b', // 橙色

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 4) return [];

    // 计算第一条线的角度（点1到点2，上端椎的上边缘）
    const dx1 = points[1].x - points[0].x;
    const dy1 = points[1].y - points[0].y;
    const angle1 = Math.atan2(dy1, dx1);

    // 计算第二条线的角度（点3到点4，下端椎的下边缘）
    const dx2 = points[3].x - points[2].x;
    const dy2 = points[3].y - points[2].y;
    const angle2 = Math.atan2(dy2, dx2);

    // 计算两条线的夹角（绝对值）
    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);

    // 确保角度在0-180度范围内
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }

    // 判断正负：比较左右两侧的y坐标距离
    // 左边点的y距离（点1到点3）
    const leftYDistance = Math.abs(points[2].y - points[0].y);
    // 右边点的y距离（点2到点4）
    const rightYDistance = Math.abs(points[3].y - points[1].y);

    // 右凸（右边距离大）→ 正值
    // 左凸（左边距离大）→ 负值
    const signedAngle = leftYDistance > rightYDistance ? -angleDiff : angleDiff;

    return [
      {
        name: 'Cobb角',
        value: signedAngle.toFixed(2),
        unit: '°',
      },
    ];
  },

  getLabelPosition: (points: Point[], imageScale: number = 1) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    // 找到最右侧的点，标签放在右上方，避免遮挡线段
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

    // 检查是否接近任意点
    for (const point of points) {
      if (isPointNearPoint(mousePoint, point, tolerance)) return true;
    }

    // 检查是否接近两条线段
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
    return COBB_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1
  ) => {
    return Renderers.renderTwoLines(points, displayColor);
  },
};

// 保留旧的配置作为别名，以兼容现有代码
export const COBB_THORACIC_CONFIG = COBB_CONFIG;
export const COBB_LUMBAR_CONFIG = COBB_CONFIG;

export const COBB1_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb1',
  name: 'Cobb1',
  description: 'Cobb角1测量',
  color: '#3b82f6', // 蓝色
};

/**
 * Cobb2 第二个Cobb角（紫色）
 */
export const COBB2_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb2',
  name: 'Cobb2',
  description: 'Cobb角2测量',
  color: '#a855f7', // 紫色
};

/**
 * Cobb3 第三个Cobb角（粉色）
 */
export const COBB3_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb3',
  name: 'Cobb3',
  description: 'Cobb角3测量',
  color: '#ec4899', // 粉色
};
