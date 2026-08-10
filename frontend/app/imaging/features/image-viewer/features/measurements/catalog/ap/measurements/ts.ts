import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateTsResults,
  isTsInRange,
} from '@xiehe/imaging-core/measurements/ap';
import type { Point } from '@xiehe/imaging-core/contracts';
import { getVertebraCenterGeometry } from '@xiehe/imaging-core/geometry';

export const TS_CONFIG: AnnotationConfig = {
  id: 'ts',
  name: 'TS',
  icon: 'medical-ts',
  description: '躯干偏移TS(Trunk Shift)',
  pointsNeeded: 6,
  category: 'measurement',
  color: '#06b6d4',
  maxXRightLabel: true,
  apLabelGapX: 24, // C7锥体框比单点宽，额外推远标签（默认 8px）
  fixedLabelPosition: true, // 固定在锥体右侧，不参与智能避让（避免被 T1 Tilt 标签推走）

  calculateResults: calculateTsResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length >= 2 && points.length < 6) {
      // 2点模式：锚点在右侧端点，渲染层用 AP_LABEL_GAP 加固定间距
      const rightPoint = points[0].x >= points[1].x ? points[0] : points[1];
      return { x: rightPoint.x, y: rightPoint.y };
    }

    if (points.length < 6) return points[0] || { x: 0, y: 0 };

    // 6点模式：[tl(0), tr(1), bl(2), br(3), SR(4), SL(5)]
    // 锚点 X = 4个C7角点中最大的 X（C7锥体右边缘）
    // 锚点 Y = C7 两条对边中点连线交点的 Y
    // fixedLabelPosition:true 保证不被智能避让推走
    const boxPoints = [points[0], points[1], points[2], points[3]];
    const maxX = Math.max(...boxPoints.map(p => p.x));
    const center = getVertebraCenterGeometry([
      points[0],
      points[1],
      points[2],
      points[3],
    ]).center;
    return { x: maxX, y: center.y };
  },

  isInHoverRange: isTsInRange,
  isInSelectionRange: isTsInRange,

  rendererId: 'c7-offset',
};
