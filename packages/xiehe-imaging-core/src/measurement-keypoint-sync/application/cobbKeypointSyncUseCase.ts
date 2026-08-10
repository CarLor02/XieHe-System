import {
  getAnnotationTypeId,
  resolveCobbMeasurement,
} from '../../measurements/domain';
import {
  AnnotationSource,
  type MeasurementData,
} from '../../shared/domain/contracts';
import {
  type KeypointAnnotation,
  upsertKeypoint,
} from '../../keypoints/domain';
import { getLateralCobbPlacementPointIds } from '../../measurements/domain/manual-tools/lateral';

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
  return syncCobbPointSlotsToKeypoints(keypoints, measurement, replacementIds);
}

function hasSamePoint(
  existing: KeypointAnnotation | undefined,
  point: MeasurementData['points'][number]
): boolean {
  return existing?.point.x === point.x && existing.point.y === point.y;
}

function syncCobbPointSlotsToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData,
  replacementIds: readonly (string | null)[]
): KeypointAnnotation[] {
  const activeReplacementIds = replacementIds.filter((id): id is string =>
    Boolean(id)
  );
  const replacementIdSet = new Set(activeReplacementIds);
  const existingById = new Map(
    keypoints.map(keypoint => [keypoint.id, keypoint])
  );
  const retainedKeypoints = keypoints.filter(
    keypoint => !replacementIdSet.has(keypoint.id)
  );

  return replacementIds.reduce((nextKeypoints, keypointId, index) => {
    if (!keypointId || !measurement.points[index]) return nextKeypoints;
    const existing = existingById.get(keypointId);
    const preservesExistingMetadata = hasSamePoint(
      existing,
      measurement.points[index]
    );
    return upsertKeypoint(nextKeypoints, {
      id: keypointId,
      point: measurement.points[index],
      source:
        preservesExistingMetadata && existing
          ? existing.source
          : AnnotationSource.MANUAL,
      confidence:
        preservesExistingMetadata && existing ? existing.confidence : 1,
    });
  }, retainedKeypoints);
}

/**
 * 部分端椎已知的手动侧位 Cobb 只写回已知端椎槽位。待定端椎的两个点
 * 暂留在 measurement 中，用户之后选定端椎时再由完整同步入口写回。
 */
export function syncAvailableLateralCobbEndpointsToKeypoints(
  keypoints: KeypointAnnotation[],
  measurement: MeasurementData
): KeypointAnnotation[] {
  return syncCobbPointSlotsToKeypoints(
    keypoints,
    measurement,
    getLateralCobbPlacementPointIds({
      upperVertebra: measurement.upperVertebra ?? null,
      lowerVertebra: measurement.lowerVertebra ?? null,
    })
  );
}
