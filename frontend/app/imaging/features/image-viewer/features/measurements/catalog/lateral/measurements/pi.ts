import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculatePiResults,
  isPiInRange,
} from '@xiehe/imaging-core/measurements/lateral';
import { getPelvicMeasurementGeometry } from '@xiehe/imaging-core/measurements/lateral';
import type { Point } from '@xiehe/imaging-core/contracts';

export const PI_CONFIG: AnnotationConfig = {
  id: 'pi',
  name: 'PI',
  icon: 'medical-pi',
  description: '骨盆入射角(Pelvic Incidence)',
  pointsNeeded: 3,
  category: 'measurement',
  color: '#f59e0b',
  fixedLabelPosition: true,

  calculateResults: calculatePiResults,

  getLabelPosition: (points: Point[]) => {
    const geometry = getPelvicMeasurementGeometry(points);
    if (!geometry || !geometry.femoralHeadCenter)
      return points[0] || { x: 0, y: 0 };

    // 标签锚点放在骶骨中点（弧所在位置），renderMeasurement 中以 textAnchor="middle" 居中
    return geometry.sacralMidpoint;
  },

  isInHoverRange: isPiInRange,
  isInSelectionRange: isPiInRange,

  rendererId: 'pi',
};
