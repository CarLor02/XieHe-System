import * as Renderers from '../../../components/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
  calculateActualDistance,
} from '../../shared/annotation-config-utils';

export const AVT_CONFIG: AnnotationConfig = {
  id: 'avt',
  name: 'AVT',
  icon: 'ri-focus-2-line',
  description: '顶椎平移量(Apical Vertebral Translation)',
  // 6点模式：[tl, tr, bl, br, SR, SL]；旧2点兜底：[apexCenter, csvlRef]
  pointsNeeded: 6,
  category: 'measurement',
  color: '#059669',
  maxXRightLabel: true,

  calculateResults: (points: Point[], context: CalculationContext) => {
    if (points.length < 2) return [];

    let apexCenterX: number, csvlX: number;

    if (points.length >= 6) {
      // 6点格式：[tl, tr, bl, br, SR, SL]
      apexCenterX =
        (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
      csvlX = (points[4].x + points[5].x) / 2;
    } else {
      // 2点兜底（旧数据）：[apexCenter, csvlRef]
      apexCenterX = points[0].x;
      csvlX = points[1].x;
    }

    const pixelOffset = apexCenterX - csvlX;
    const actualDistance = calculateActualDistance(Math.abs(pixelOffset), context);
    const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

    return [{ name: 'AVT', value: signedDistance.toFixed(2), unit: 'mm' }];
  },

  getLabelPosition: (points: Point[], _imageScale: number = 1) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // maxXRightLabel: 锚点 = 所有点最大 X，Y 取最右点 Y（渲染层加固定间距）
    const rightPoint = points.reduce((a, b) => (b.x > a.x ? b : a));
    return { x: rightPoint.x, y: rightPoint.y };
  },

  isInHoverRange: (mousePoint: Point, points: Point[], tolerance = 10) => {
    if (points.length < 2) return false;
    if (points.length >= 6) {
      // 6点格式：检查顶椎中心线或骶骨中点线
      const centerX =
        (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
      const midX = (points[4].x + points[5].x) / 2;
      return (
        Math.abs(mousePoint.x - centerX) <= tolerance ||
        Math.abs(mousePoint.x - midX) <= tolerance
      );
    }
    return (
      Math.abs(mousePoint.x - points[0].x) <= tolerance ||
      Math.abs(mousePoint.x - points[1].x) <= tolerance
    );
  },

  isInSelectionRange: (mousePoint: Point, points: Point[], tolerance = 15) => {
    return AVT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (points: Point[], displayColor: string, imageScale = 1) => {
    return Renderers.renderC7Offset(points, displayColor, imageScale);
  },
};
