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
   * 是否允许 AI 初次检测或显式关键点确认后的全量固定派生创建该测量项。
   * 拖动、拖动预览、删除和加载旧数据不得使用该字段创建缺失项。
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
  /**
   * 返回当前关键点可直接继承到手动工具 points[] 的槽位。
   *
   * 该映射允许工具只补充缺失点；这里必须保留 measurement 的语义索引，
   * 不能对不完整点集执行几何排序。
   */
  getAvailableMeasurementPointMap: (
    byId: Map<string, KeypointAnnotation>
  ) => Map<number, Point>;
  getDrawingHint?: (pointIndex: number) => string | null;
}
