import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

import type { NormalizedMeasurementPoints } from './point-normalization';

export type MeasurementKeypointExamView = 'ap' | 'lateral';

export interface MeasurementKeypointUpdate {
  keypointId: string;
  point: Point;
}

export interface MeasurementKeypointBindingRule {
  typeId: string;
  examView: MeasurementKeypointExamView;
  requiredKeypointIds: readonly string[];
  /** 是否允许关键点满足最小依赖后自动创建全局唯一测量项。 */
  autoDerive: boolean;
  normalizePoints: (points: Point[]) => NormalizedMeasurementPoints;
  getKeypointUpdates: (
    points: Point[],
    changedPointIndex?: number
  ) => MeasurementKeypointUpdate[];
  buildMeasurementPoints: (
    byId: Map<string, KeypointAnnotation>,
    existingPoints?: Point[]
  ) => Point[] | null;
  getDrawingHint?: (pointIndex: number) => string | null;
}
