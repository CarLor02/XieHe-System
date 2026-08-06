import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  buildAvtPoints,
  getAvtPointKeypointId,
  getAvtReferencePointCount,
  getAvtRequiredKeypointIds,
  getAvtTargetPointCount,
  isAvtMetadata,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/avt';
import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

import type { MeasurementKeypointBindingRule } from './binding-rule-types';

/**
 * AVT 的绑定依赖 measurement metadata，不能像 CA、CSS 一样只按 type 注册。
 * 椎间盘 a、b 是测量项自有点，规则只映射目标椎体及 C7PL/CSVL 关键点。
 */
export function getAvtMeasurementKeypointBindingRule(
  measurement: MeasurementData
): MeasurementKeypointBindingRule | null {
  const metadata = measurement.avtMetadata;
  if (!isAvtMetadata(metadata)) {
    // 历史兼容：无 v2 metadata 的两点/六点 AVT 无法可靠确定目标与参考线，
    // 不得根据点数猜测并回填全局关键点。
    return null;
  }

  return {
    typeId: 'avt',
    examView: 'ap',
    requiredKeypointIds: getAvtRequiredKeypointIds(metadata),
    autoDerive: false,
    normalizePoints: points => ({
      points: points.map(point => ({ ...point })),
      sourceIndices: points.map((_, index) => index),
    }),
    getKeypointUpdates: (points, changedPointIndex) =>
      points.flatMap((point, pointIndex) => {
        if (
          changedPointIndex !== undefined &&
          changedPointIndex !== pointIndex
        ) {
          return [];
        }
        const keypointId = getAvtPointKeypointId(metadata, pointIndex);
        return keypointId ? [{ keypointId, point: { ...point } }] : [];
      }),
    buildMeasurementPoints: (
      byId: Map<string, KeypointAnnotation>,
      existingPoints?: Point[]
    ) => {
      const discAnchors =
        metadata.target.type === 'disc' && existingPoints?.length
          ? (existingPoints.slice(0, 2) as [Point, Point])
          : undefined;
      return buildAvtPoints(
        metadata,
        new Map(
          Array.from(byId, ([keypointId, keypoint]) => [
            keypointId,
            keypoint.point,
          ])
        ),
        discAnchors
      );
    },
    getAvailableMeasurementPointMap: byId => {
      const available = new Map<number, Point>();
      const pointCount =
        getAvtTargetPointCount(metadata) + getAvtReferencePointCount(metadata);
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const keypointId = getAvtPointKeypointId(metadata, pointIndex);
        const keypoint = keypointId ? byId.get(keypointId) : undefined;
        if (keypoint) {
          available.set(pointIndex, { ...keypoint.point });
        }
      }
      return available;
    },
  };
}
