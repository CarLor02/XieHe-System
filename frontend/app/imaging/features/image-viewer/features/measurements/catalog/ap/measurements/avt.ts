import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig, SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateLegacyAvtResults,
  isAvtInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/avt';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

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

  calculateResults: calculateLegacyAvtResults,

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

  isInHoverRange: isAvtInRange,
  isInSelectionRange: isAvtInRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderC7Offset(points, displayColor, imageScale, context);
  },
};
