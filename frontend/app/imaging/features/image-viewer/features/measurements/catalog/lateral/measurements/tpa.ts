import * as Renderers from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers';
import type { AnnotationConfig, SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import { LABEL_OFFSET } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/label-layout';
import { calculateTpaResults, isTpaInRange } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/tpa';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export const TPA_CONFIG: AnnotationConfig = {
  id: 'tpa',
  name: 'TPA',
  icon: 'medical-tpa',
  description: 'T1骨盆角(T1 Pelvic Angle)',
  pointsNeeded: 7,
  category: 'measurement',
  color: '#ec4899',

  calculateResults: calculateTpaResults,

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

  isInHoverRange: isTpaInRange,
  isInSelectionRange: isTpaInRange,

  renderSpecialElements: (
    points: Point[],
    displayColor: string,
    imageScale: number = 1,
    context?: SpecialElementRenderContext
  ) => {
    return Renderers.renderTPA(points, displayColor, imageScale, context);
  },
};
