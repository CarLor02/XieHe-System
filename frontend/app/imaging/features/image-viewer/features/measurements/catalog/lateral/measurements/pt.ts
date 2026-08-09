import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculatePtResults,
  isPtInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pt';
import { getPelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
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
