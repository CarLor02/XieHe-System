import { AP_VERTEBRA_GROUPS } from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/ap';
import { LATERAL_CENTER_VERTEBRA_GROUPS } from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/lateral';
import {
  isAnteriorExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/exam-type';
import {
  type KeypointAnnotation,
  sortKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint';
import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';

export function upsertKeypoint(
  keypoints: KeypointAnnotation[],
  nextKeypoint: KeypointAnnotation
): KeypointAnnotation[] {
  const withoutDuplicate = keypoints.filter(
    keypoint => keypoint.id !== nextKeypoint.id
  );
  return sortKeypoints([...withoutDuplicate, nextKeypoint]);
}

export function deleteKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): KeypointAnnotation[] {
  return keypoints.filter(keypoint => keypoint.id !== keypointId);
}

export function deleteKeypoints(
  keypoints: KeypointAnnotation[],
  keypointIds: string[]
): KeypointAnnotation[] {
  const idsToDelete = new Set(keypointIds);
  return keypoints.filter(keypoint => !idsToDelete.has(keypoint.id));
}

export function areKeypointsEqual(
  left: KeypointAnnotation[],
  right: KeypointAnnotation[]
): boolean {
  if (left.length !== right.length) return false;

  const sortedLeft = [...left].sort((a, b) => a.id.localeCompare(b.id));
  const sortedRight = [...right].sort((a, b) => a.id.localeCompare(b.id));

  return sortedLeft.every((item, index) => {
    const other = sortedRight[index];
    return (
      item.id === other.id &&
      item.source === other.source &&
      item.confidence === other.confidence &&
      item.point.x === other.point.x &&
      item.point.y === other.point.y
    );
  });
}

function isSamePoint(
  left: KeypointAnnotation['point'],
  right: KeypointAnnotation['point']
): boolean {
  return left.x === right.x && left.y === right.y;
}

/** 仅将实际发生坐标变化的关键点标记为人工来源。 */
export function markMovedKeypointsManual(
  previousKeypoints: KeypointAnnotation[],
  nextKeypoints: KeypointAnnotation[]
): KeypointAnnotation[] {
  const previousById = new Map(
    previousKeypoints.map(keypoint => [keypoint.id, keypoint])
  );

  return sortKeypoints(
    nextKeypoints.map(nextKeypoint => {
      const previousKeypoint = previousById.get(nextKeypoint.id);
      if (
        !previousKeypoint ||
        isSamePoint(previousKeypoint.point, nextKeypoint.point)
      ) {
        return previousKeypoint
          ? {
              ...nextKeypoint,
              source: previousKeypoint.source,
              confidence: previousKeypoint.confidence,
            }
          : nextKeypoint;
      }

      return {
        ...nextKeypoint,
        source: AnnotationSource.MANUAL,
      };
    })
  );
}

export function hasKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): boolean {
  return keypoints.some(keypoint => keypoint.id === keypointId);
}

function getCompleteGroups(
  keypoints: KeypointAnnotation[],
  groups: readonly string[]
): string[] {
  const byId = new Set(keypoints.map(keypoint => keypoint.id));
  return groups.filter(group =>
    [1, 2, 3, 4].every(pointNumber => byId.has(`${group}-${pointNumber}`))
  );
}

export function getCompleteApVertebraGroups(
  keypoints: KeypointAnnotation[]
): string[] {
  return getCompleteGroups(keypoints, AP_VERTEBRA_GROUPS);
}

/** 返回当前检查类型中四角点完整、可作为椎体中心的分组。 */
export function getCompleteSelectableVertebraGroups(
  keypoints: KeypointAnnotation[],
  examType: string
): string[] {
  if (isLateralExamType(examType)) {
    return getCompleteGroups(keypoints, LATERAL_CENTER_VERTEBRA_GROUPS);
  }
  if (isAnteriorExamType(examType)) {
    return getCompleteApVertebraGroups(keypoints);
  }
  return [];
}
