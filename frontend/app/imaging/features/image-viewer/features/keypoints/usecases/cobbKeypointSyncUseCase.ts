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

function normalizeCobbEndpoint(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

export function hasSameCobbEndpointVertebrae(
  measurement: MeasurementData
): boolean {
  const upperVertebra = normalizeCobbEndpoint(measurement.upperVertebra);
  const lowerVertebra = normalizeCobbEndpoint(measurement.lowerVertebra);
  return Boolean(
    upperVertebra && lowerVertebra && upperVertebra === lowerVertebra
  );
}

function hasCompletedDistinctCobbEndpoints(
  measurement: MeasurementData
): boolean {
  const upperVertebra = normalizeCobbEndpoint(measurement.upperVertebra);
  const lowerVertebra = normalizeCobbEndpoint(measurement.lowerVertebra);
  return Boolean(
    upperVertebra && lowerVertebra && upperVertebra !== lowerVertebra
  );
}

export function canSyncCobbMeasurementToKeypoints(
  measurement: MeasurementData
): boolean {
  return (
    /^(?:lateral-)?cobb\d*$/i.test(getAnnotationTypeId(measurement.type)) &&
    hasCompletedDistinctCobbEndpoints(measurement) &&
    measurement.points.length >= 4
  );
}

export function syncCobbMeasurementToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData,
  examType?: string
): KeypointAnnotation[] | null {
  if (!canSyncCobbMeasurementToKeypoints(measurement)) return null;

  const upperVertebra = normalizeCobbEndpoint(measurement.upperVertebra);
  const lowerVertebra = normalizeCobbEndpoint(measurement.lowerVertebra);
  const hasExplicitExamType =
    typeof examType === 'string' && examType.trim().length > 0;
  const shouldInferLateralEndpointRules =
    !hasExplicitExamType &&
    (lowerVertebra === 'S1' ||
      Boolean(
        getLateralNamedCobbMeasurementRuleByEndpoints(
          upperVertebra,
          lowerVertebra
        )
      ));
  const shouldUseLateralEndpointRules =
    (hasExplicitExamType && isLateralExamType(examType)) ||
    shouldInferLateralEndpointRules;
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
