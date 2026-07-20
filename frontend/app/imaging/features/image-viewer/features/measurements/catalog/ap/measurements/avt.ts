import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import {
  type AnnotationConfig,
  type CalculationContext,
  type Point,
  type SpecialElementRenderContext,
  calculateActualDistance,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const AVT_CONFIG: AnnotationConfig = {
  id: 'avt',
  name: 'AVT',
  icon: 'ri-focus-2-line',
  description: '顶椎平移量(Apical Vertebral Translation)',
  // 当前格式使用6点：[tl, tr, bl, br, SR, SL]。
  // pointsNeeded 不能降为2；历史标注中的2点格式仅由下方兼容分支读取。
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
      // 历史兼容：旧 AVT 仅保存 [apexCenter, csvlRef] 两点。
      // 已有标注仍依赖该格式完成计算，不能按当前6点语义读取或直接移除此分支。
      apexCenterX = points[0].x;
      csvlX = points[1].x;
    }

    const pixelOffset = apexCenterX - csvlX;
    const actualDistance = calculateActualDistance(Math.abs(pixelOffset), context);
    const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;

    return [{ name: 'AVT', value: signedDistance.toFixed(2), unit: 'mm' }];
  },

  getLabelPosition: (points: Point[]) => {
    if (points.length === 0) return { x: 0, y: 0 };

    if (points.length < 6) {
      // 历史兼容：旧2点 AVT 的 points[0] 是顶椎中心，points[1] 是 CSVL 参考点。
      // 标签必须锚定顶椎中心；若取全部点的最右侧，会再次落到下方共享的 CSVL 区域。
      return points[0];
    }

    const apexPoints = points.slice(0, 4);
    const rightX = Math.max(...apexPoints.map(point => point.x));
    const centerY =
      apexPoints.reduce((sum, point) => sum + point.y, 0) /
      apexPoints.length;

    // maxXRightLabel 会在渲染层追加固定屏幕间距，此处只返回顶椎右侧中心锚点。
    return { x: rightX, y: centerY };
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
    // 历史兼容：旧2点 AVT 使用 [apexCenter, csvlRef]，两条垂直参考线都应可命中。
    // 已保存的旧标注仍会进入此分支，因此不能只保留当前6点格式的命中规则。
    return (
      Math.abs(mousePoint.x - points[0].x) <= tolerance ||
      Math.abs(mousePoint.x - points[1].x) <= tolerance
    );
  },

  isInSelectionRange: (mousePoint: Point, points: Point[], tolerance = 15) => {
    return AVT_CONFIG.isInHoverRange(mousePoint, points, tolerance);
  },

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderC7Offset(points, displayColor, imageScale, context);
  },
};
