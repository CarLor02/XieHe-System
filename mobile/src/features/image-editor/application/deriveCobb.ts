import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import {
  isKeypointSupportedExamType,
  isLateralExamType,
} from '@xiehe/imaging-core/anatomy';
import {
  createNextBoundCobbMeasurement,
  getMeasurementDeriveEndpointGroups,
  hasCobbMeasurementForEndpoints,
  isValidMeasurementDeriveEndpointOrder,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { getLateralNamedCobbMeasurementRuleByEndpoints } from '@xiehe/imaging-core/measurements/lateral';
import { measurementCalculator } from './measurementValues';

export function deriveCobbFromKeypoints(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  upperVertebra: string,
  lowerVertebra: string
): AnnotationEditorSnapshot {
  const examType = context.examType ?? '';
  if (!isKeypointSupportedExamType(examType))
    throw new Error('此检查类型不支持测量项派生');
  if (!isValidMeasurementDeriveEndpointOrder(upperVertebra, lowerVertebra))
    throw new Error('上端椎不应该比下端椎更靠下或与下端椎相同');
  if (
    isLateralExamType(examType) &&
    getLateralNamedCobbMeasurementRuleByEndpoints(upperVertebra, lowerVertebra)
  )
    throw new Error('请使用专用工具创建此测量项');
  if (
    hasCobbMeasurementForEndpoints(
      snapshot.measurements,
      upperVertebra,
      lowerVertebra
    )
  )
    throw new Error(
      `Cobb${upperVertebra}-${lowerVertebra}已经存在，不可重复派生`
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
