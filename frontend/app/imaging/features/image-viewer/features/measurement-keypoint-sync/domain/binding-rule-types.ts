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
  /**
   * 是否允许 AI 初次检测或手动工具完成后的局部流程创建该测量项。
   * 手工补点、拖动关键点和加载旧数据均不得使用该字段创建缺失项。
   */
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
