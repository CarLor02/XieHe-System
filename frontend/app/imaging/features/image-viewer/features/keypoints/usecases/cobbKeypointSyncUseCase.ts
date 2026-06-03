import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  AnnotationSource,
  type MeasurementData,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  isLateralExamType,
  upsertKeypoint,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  getLateralCobbEndpointPointIds,
  getLateralNamedCobbMeasurementRuleByEndpoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';

function hasCompletedCobbEndpoints(measurement: MeasurementData): boolean {
  return Boolean(
    measurement.upperVertebra?.trim() && measurement.lowerVertebra?.trim()
  );
}

export function canSyncCobbMeasurementToKeypoints(
  measurement: MeasurementData
): boolean {
  return (
    /^cobb\d*$/i.test(getAnnotationTypeId(measurement.type)) &&
    hasCompletedCobbEndpoints(measurement) &&
    measurement.points.length >= 4
  );
}

export function syncCobbMeasurementToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData,
  examType?: string
): KeypointAnnotation[] | null {
  if (!canSyncCobbMeasurementToKeypoints(measurement)) return null;

  const upperVertebra = measurement.upperVertebra!.trim().toUpperCase();
  const lowerVertebra = measurement.lowerVertebra!.trim().toUpperCase();
  const shouldUseLateralEndpointRules =
    (examType && isLateralExamType(examType)) ||
    lowerVertebra === 'S1' ||
    Boolean(
      getLateralNamedCobbMeasurementRuleByEndpoints(
        upperVertebra,
        lowerVertebra
      )
    );
  const replacementIds =
    shouldUseLateralEndpointRules
      ? getLateralCobbEndpointPointIds(upperVertebra, lowerVertebra)
      : [
          `${upperVertebra}-1`,
          `${upperVertebra}-2`,
          `${lowerVertebra}-3`,
          `${lowerVertebra}-4`,
        ];
  const replacementIdSet = new Set(replacementIds);
  const retainedKeypoints = keypoints.filter(
    keypoint => !replacementIdSet.has(keypoint.id)
  );

  return replacementIds.reduce(
    (nextKeypoints, keypointId, index) =>
      upsertKeypoint(nextKeypoints, {
        id: keypointId,
        point: measurement.points[index],
        source: AnnotationSource.MANUAL,
        confidence: 1,
      }),
    retainedKeypoints
  );
}
