import { getAnnotationTypeId } from '../../../shared-rules';
import {
  invalid,
  resolved,
  type MeasurementResolver,
  type ResolvedVariableMeasurementBase,
} from '../../../shared-rules';
import { isApProjectionExamType } from '../../../../anatomy';
import type { Point } from '../../../../contracts';

import { isManualTtsMeasurement } from './interaction';

export interface ResolvedTtsMeasurement extends ResolvedVariableMeasurementBase {
  kind: 'tts';
  layout: 'manual' | 'keypoint-derived';
  trunkPoints: readonly [Point, Point];
  sacralPoints: readonly [Point, Point];
  trunkCenter: Point;
  sacralCenter: Point;
}

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export const TTS_MEASUREMENT_RESOLVER: MeasurementResolver<ResolvedTtsMeasurement> =
  {
    id: 'ap-tts',
    supports(measurement, context) {
      return (
        isApProjectionExamType(context.examType) &&
        getAnnotationTypeId(measurement.type) === 'tts'
      );
    },
    resolve(measurement) {
      if (measurement.points.length !== 4) {
        return invalid('TTS 必须包含躯干水平线和骶骨参考线共四个点');
      }
      const trunkPoints = [
        measurement.points[0],
        measurement.points[1],
      ] as const;
      const sacralPoints = [
        measurement.points[2],
        measurement.points[3],
      ] as const;
      return resolved({
        kind: 'tts',
        resolverId: 'ap-tts',
        measurement,
        layout: isManualTtsMeasurement(measurement)
          ? 'manual'
          : 'keypoint-derived',
        trunkPoints,
        sacralPoints,
        trunkCenter: midpoint(trunkPoints[0], trunkPoints[1]),
        sacralCenter: midpoint(sacralPoints[0], sacralPoints[1]),
        interactivePoints: measurement.points,
      });
    },
  };

export function resolveTtsMeasurement(
  measurement: Parameters<typeof TTS_MEASUREMENT_RESOLVER.resolve>[0]
): ResolvedTtsMeasurement | null {
  if (getAnnotationTypeId(measurement.type) !== 'tts') return null;
  const result = TTS_MEASUREMENT_RESOLVER.resolve(measurement, {
    examType: '正位X光片',
  });
  return result.status === 'resolved' ? result.value : null;
}
