import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';
import {
  calculatePtResults,
  isPtInRange,
} from '@xiehe/imaging-core/measurements/lateral';
import { getPelvicMeasurementGeometry } from '@xiehe/imaging-core/measurements/lateral';
import type { Point } from '@xiehe/imaging-core/contracts';

export const PT_CONFIG: AnnotationConfig = {
  id: 'pt',
  name: 'PT',
  icon: 'medical-pt',
  description: '骨盆倾斜角(Pelvic Tilt)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#f97316',
  fixedLabelPosition: true,

  calculateResults: calculatePtResults,

  getLabelPosition: (points: Point[]) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    // 标签锚点在股骨头中心（弧顶点），renderMeasurement 用 textAnchor="middle" 居中显示
    return geometry.femoralHeadCenter;
  },

  isInHoverRange: isPtInRange,
  isInSelectionRange: isPtInRange,

  rendererId: 'pt',
};
