import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import {
  calculateCaResults,
  isCaInRange,
} from '@xiehe/imaging-core/measurements/ap';
import type { Point } from '@xiehe/imaging-core/contracts';

export const CA_CONFIG: AnnotationConfig = {
  id: 'ca',
  name: 'CA',
  icon: 'ri-contrast-line',
  description: '锁骨角测量(Clavicle Angle)',
  pointsNeeded: 2,
  category: 'measurement',
  color: '#10b981',
  maxXRightLabel: true,

  calculateResults: calculateCaResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    // maxXRightLabel=true：渲染层在屏幕坐标系统一加 AP_LABEL_GAP + textWidth/2。
    // 此处只返回右侧端点（无额外偏移），避免双重累加导致缩小时间距过大。
    const rightPoint = points[0].x > points[1].x ? points[0] : points[1];
    return { x: rightPoint.x, y: rightPoint.y };
  },

  isInHoverRange: isCaInRange,
  isInSelectionRange: isCaInRange,

  rendererId: 'single-line-with-horizontal',
};
