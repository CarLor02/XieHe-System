import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import {
  isCobbMeasurement,
  syncCobbMeasurementToKeypoints,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import { getVertebraOptions } from './editorToolQueries';
import { confirmKeypoints } from './editorSnapshot';
import {
  validateCobbEndpoints,
  type CobbEndpointField,
} from './cobbEndpointRules';

export function updateCobbEndpoint(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  measurementId: string,
  field: CobbEndpointField,
  value: string
): AnnotationEditorSnapshot {
  const measurement = snapshot.measurements.find(
    item => item.id === measurementId
  );
  if (!measurement || !isCobbMeasurement(measurement))
    throw new Error('当前测量不支持修改 Cobb 端椎');
  const examType = context.examType ?? '';
  const vertebra = value.trim().toUpperCase();
  if (!getVertebraOptions(examType).includes(vertebra))
    throw new Error('该检查类型不支持所选端椎');
  const updated = { ...measurement, [field]: vertebra };
  const upper = updated.upperVertebra?.trim().toUpperCase() ?? '';
  const lower = updated.lowerVertebra?.trim().toUpperCase() ?? '';
  validateCobbEndpoints(
    snapshot.measurements,
    examType,
    upper,
    lower,
    measurementId
  );
  if (measurement[field] === vertebra) return snapshot;

  // 改端椎是给现有几何重新指定归属：由共享用例把 Cobb 点位写回目标关键点。
  const keypoints = syncCobbMeasurementToKeypoints(
    snapshot.keypoints,
    updated,
    examType
  );
  const next = {
    ...snapshot,
    measurements: snapshot.measurements.map(item =>
      item.id === measurementId
        ? keypoints
          ? {
              ...updated,
              upperVertebra: upper,
              lowerVertebra: lower,
              keypointSynced: true,
            }
          : updated
        : item
    ),
  };
  // 端椎改变了测量依赖，即使目标点坐标恰好相同，也必须完成一次全量同步。
  return keypoints
    ? confirmKeypoints(next, keypoints, context, { recalculateAll: true })
    : next;
}
