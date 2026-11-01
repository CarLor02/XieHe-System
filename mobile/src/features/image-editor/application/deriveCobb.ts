import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import { isKeypointSupportedExamType } from '@xiehe/imaging-core/anatomy';
import {
  createNextBoundCobbMeasurement,
  getMeasurementDeriveEndpointGroups,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { measurementCalculator } from './measurementValues';
import { validateCobbEndpoints } from './cobbEndpointRules';

export function deriveCobbFromKeypoints(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  upperVertebra: string,
  lowerVertebra: string
): AnnotationEditorSnapshot {
  const examType = context.examType ?? '';
  if (!isKeypointSupportedExamType(examType))
    throw new Error('此检查类型不支持测量项派生');
  if (!upperVertebra || !lowerVertebra) throw new Error('请选择上下端椎');
  validateCobbEndpoints(
    snapshot.measurements,
    examType,
    upperVertebra,
    lowerVertebra
  );
  if (
    !getMeasurementDeriveEndpointGroups(
      snapshot.keypoints,
      examType,
      'upper'
    ).includes(upperVertebra) ||
    !getMeasurementDeriveEndpointGroups(
      snapshot.keypoints,
      examType,
      'lower'
    ).includes(lowerVertebra)
  )
    throw new Error(
      `缺少 ${upperVertebra}-${lowerVertebra} 所需端板关键点，无法创建 Cobb`
    );
  const measurement = createNextBoundCobbMeasurement({
    upperVertebra,
    lowerVertebra,
    keypoints: snapshot.keypoints,
    examType,
    calculationContext: context,
    existingMeasurements: snapshot.measurements,
    calculator: measurementCalculator,
  });
  if (!measurement) throw new Error('当前端板关键点无法创建 Cobb');
  return { ...snapshot, measurements: [...snapshot.measurements, measurement] };
}
