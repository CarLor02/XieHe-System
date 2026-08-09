import {
  keypointsToPersistedLayer,
  type KeypointAnnotation,
  vertebraeLayerToKeypoints,
} from '../../keypoints';
import { isKeypointSupportedExamType } from '../../shared/domain/anatomy';
import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '../../shared/domain/contracts';

import { backfillMissingBoundKeypoints } from '../domain/measurement-keypoint-binding';

export interface PersistedKeypointStateInput {
  examType: string;
  measurements: MeasurementData[];
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
}

export interface HydratedKeypointState {
  keypoints: KeypointAnnotation[];
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
}

/**
 * 将一次持久化标注快照原子地恢复成关键点状态。
 *
 * 必须先从完整检测层恢复关键点，再根据历史测量项补齐缺失绑定点。
 * 不能分别通过 React effect 执行这两个步骤，否则测量项可能基于空状态
 * 反推关键点并覆盖完整检测层。
 */
export function hydratePersistedKeypointState({
  examType,
  measurements,
  vertebraeLayer,
  cfhAnnotation,
}: PersistedKeypointStateInput): HydratedKeypointState {
  if (!isKeypointSupportedExamType(examType)) {
    return {
      keypoints: [],
      vertebraeLayer,
      cfhAnnotation,
    };
  }

  const restoredKeypoints = vertebraeLayerToKeypoints(
    vertebraeLayer,
    examType,
    cfhAnnotation
  );
  const keypoints = backfillMissingBoundKeypoints(
    restoredKeypoints,
    measurements
  );

  return {
    keypoints,
    vertebraeLayer:
      keypoints.length > 0
        ? keypointsToPersistedLayer(keypoints)
        : vertebraeLayer,
    cfhAnnotation,
  };
}
