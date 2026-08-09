import { getAnnotationTypeId } from '../../../measurements/domain';
import type { MeasurementData } from '../../../shared/domain/contracts';

import { buildMeasurementKeypointDependencyGraph } from './measurement-dependency-graph';

export interface AnnotationDeletionPlan {
  measurementIdsToDelete: string[];
  keypointIdsToDelete: string[];
}

const COUPLED_MEASUREMENT_TYPE_GROUPS: readonly (readonly string[])[] = [
  ['pi', 'pt'],
];

function expandCoupledMeasurementIds(
  measurements: readonly MeasurementData[],
  targetMeasurementId: string
): Set<string> {
  const target = measurements.find(item => item.id === targetMeasurementId);
  if (!target) return new Set([targetMeasurementId]);

  const targetType = getAnnotationTypeId(target.type);
  const coupledTypes = COUPLED_MEASUREMENT_TYPE_GROUPS.find(group =>
    group.includes(targetType)
  );
  if (!coupledTypes) return new Set([targetMeasurementId]);

  return new Set(
    measurements
      .filter(measurement =>
        coupledTypes.includes(getAnnotationTypeId(measurement.type))
      )
      .map(measurement => measurement.id)
  );
}

/**
 * 一级删除：删除目标测量组，并回收该组独占、且不再被其他测量项引用的关键点。
 */
export function planMeasurementDeletion(
  measurements: readonly MeasurementData[],
  targetMeasurementId: string,
  examType: string
): AnnotationDeletionPlan {
  const graph = buildMeasurementKeypointDependencyGraph(measurements, examType);
  const measurementIdsToDelete = expandCoupledMeasurementIds(
    measurements,
    targetMeasurementId
  );
  const candidateKeypointIds = new Set<string>();
  const retainedKeypointIds = new Set<string>();

  for (const dependency of graph) {
    const destination = measurementIdsToDelete.has(dependency.measurementId)
      ? candidateKeypointIds
      : retainedKeypointIds;
    dependency.keypointIds.forEach(keypointId => destination.add(keypointId));
  }

  return {
    measurementIdsToDelete: Array.from(measurementIdsToDelete),
    keypointIdsToDelete: Array.from(candidateKeypointIds).filter(
      keypointId => !retainedKeypointIds.has(keypointId)
    ),
  };
}

/**
 * 删除关键点时只级联移除直接依赖它的测量项，不继续回收这些测量项的其他关键点。
 */
export function planKeypointDeletion(
  measurements: readonly MeasurementData[],
  selectedKeypointIds: readonly string[],
  examType: string
): AnnotationDeletionPlan {
  const keypointIdsToDelete = Array.from(new Set(selectedKeypointIds));
  const selected = new Set(keypointIdsToDelete);
  const measurementIdsToDelete = buildMeasurementKeypointDependencyGraph(
    measurements,
    examType
  )
    .filter(dependency =>
      dependency.keypointIds.some(keypointId => selected.has(keypointId))
    )
    .map(dependency => dependency.measurementId);

  return { measurementIdsToDelete, keypointIdsToDelete };
}
