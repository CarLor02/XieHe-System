import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  AnnotationSource,
  type MeasurementData,
} from '@xiehe/imaging-core/contracts';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import { upsertKeypoint } from '@/app/imaging/features/image-viewer/features/keypoints';
import { resolveCobbMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain';

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
  measurement: MeasurementData,
  examType?: string
): boolean {
  if (
    !/^(?:lateral-)?cobb\d*$/i.test(getAnnotationTypeId(measurement.type)) ||
    !hasCompletedDistinctCobbEndpoints(measurement)
  ) {
    return false;
  }
  const resolvedExamType =
    examType?.trim() ||
    (/^lateral-cobb/i.test(getAnnotationTypeId(measurement.type))
      ? '侧位X光片'
      : '正位X光片');
  return Boolean(
    resolveCobbMeasurement(measurement, { examType: resolvedExamType })
  );
}

export function syncCobbMeasurementToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData,
  examType?: string
): KeypointAnnotation[] | null {
  if (!canSyncCobbMeasurementToKeypoints(measurement, examType)) return null;

  const resolvedExamType =
    examType?.trim() ||
    (/^lateral-cobb/i.test(getAnnotationTypeId(measurement.type))
      ? '侧位X光片'
      : '正位X光片');
  const resolvedMeasurement = resolveCobbMeasurement(measurement, {
    examType: resolvedExamType,
  });
  const replacementIds = resolvedMeasurement?.endpointPointIds;
  if (!replacementIds) return null;
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
