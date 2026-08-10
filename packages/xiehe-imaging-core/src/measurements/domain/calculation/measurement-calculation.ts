import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import { getVertebraCenterGeometry } from '../../../shared/domain/geometry';

import { calculateCobbResults } from '../cobb';
import type { CalculationContext, MeasurementResult } from '../calculation-types';
import { getAnnotationTypeId } from '../annotation-type-id';
import {
  calculateAvtValue,
  calculateCaResults,
  calculateCssResults,
  calculateHemipelvicWidthRatioResults,
  calculateLegacyAvtResults,
  calculateLldResults,
  calculatePoResults,
  calculateT1TiltResults,
  calculateTsResults,
  calculateTtsResults,
} from '../manual-tools/ap';
import {
  calculateLateralCobbResults,
  calculatePiResults,
  calculatePiResultsFromGeometry,
  calculatePtResults,
  calculatePtResultsFromGeometry,
  calculateSsResults,
  calculateSvaResults,
  calculateT1SlopeResults,
  calculateTpaResults,
  calculateTpaResultsFromGeometry,
} from '../manual-tools/lateral';
import {
  resolveVariableMeasurement,
  type ResolvedVariableMeasurement,
} from '../resolver';
import {
  calculateAngleResults,
  calculateAuxiliaryAngleResults,
  calculateAuxiliaryHorizontalLineResults,
  calculateAuxiliaryLengthResults,
  calculateAuxiliaryVerticalLineResults,
  calculateCircleResults,
  calculateLengthResults,
  calculateRectangleResults,
  calculateShapeOnlyResults,
} from './auxiliary-calculations';

export type MeasurementCalculationOutcome =
  | { status: 'calculated'; results: readonly MeasurementResult[] }
  | { status: 'unsupported'; typeId: string }
  | { status: 'invalid'; typeId: string; reason: string };

type MeasurementCalculation = (
  points: Point[],
  context: CalculationContext
) => MeasurementResult[];

const lateralCobbTypeIds = new Set([
  'cl',
  'c2-c7-cl',
  'tk-t2-t5',
  'tk-t5-t12',
  't10-l2',
  'll-l1-s1',
  'll-l1-l4',
  'll-l4-s1',
]);

const calculationRegistry: Readonly<Record<string, MeasurementCalculation>> = {
  avt: calculateLegacyAvtResults,
  ca: calculateCaResults,
  cobb: calculateCobbResults,
  'cobb-thoracic': calculateCobbResults,
  'cobb-lumbar': calculateCobbResults,
  'cobb-thoracolumbar': calculateCobbResults,
  'cobb-auto1': calculateCobbResults,
  'cobb-auto2': calculateCobbResults,
  'cobb-auto3': calculateCobbResults,
  css: calculateCssResults,
  sacral: calculateCssResults,
  pelvic: calculatePoResults,
  po: calculatePoResults,
  lld: calculateLldResults,
  't1-tilt': calculateT1TiltResults,
  ts: calculateTsResults,
  tts: calculateTtsResults,
  'hemipelvic-width-ratio': calculateHemipelvicWidthRatioResults,
  'lateral-cobb': calculateLateralCobbResults,
  't1-slope': calculateT1SlopeResults,
  pi: calculatePiResults,
  pt: calculatePtResults,
  tpa: calculateTpaResults,
  ss: calculateSsResults,
  sva: calculateSvaResults,
  length: calculateLengthResults,
  angle: calculateAngleResults,
  'aux-length': calculateAuxiliaryLengthResults,
  'aux-angle': calculateAuxiliaryAngleResults,
  'aux-horizontal-line': calculateAuxiliaryHorizontalLineResults,
  'aux-vertical-line': calculateAuxiliaryVerticalLineResults,
  circle: calculateCircleResults,
  rectangle: calculateRectangleResults,
  arrow: calculateShapeOnlyResults,
  ellipse: calculateShapeOnlyResults,
  polygon: calculateShapeOnlyResults,
  'vertebra-center': calculateShapeOnlyResults,
};

function normalizedCalculationTypeId(type: string): string {
  const typeId = getAnnotationTypeId(type);
  if (/^lateral-cobb\d+$/i.test(typeId)) return 'lateral-cobb';
  if (/^cobb\d+$/i.test(typeId)) return 'cobb';
  return typeId;
}

function toOutcome(
  typeId: string,
  results: MeasurementResult[]
): MeasurementCalculationOutcome {
  return results.length > 0
    ? { status: 'calculated', results }
    : { status: 'invalid', typeId, reason: '当前点位不足或无法形成有效结果' };
}

export function calculateMeasurementTypeResults(
  type: string,
  points: Point[],
  context: CalculationContext
): MeasurementCalculationOutcome {
  const typeId = normalizedCalculationTypeId(type);
  const calculator = lateralCobbTypeIds.has(typeId)
    ? calculateLateralCobbResults
    : calculationRegistry[typeId];
  if (!calculator) return { status: 'unsupported', typeId };
  return toOutcome(typeId, calculator(points, context));
}

export function inferMeasurementResolverExamType(
  measurement: MeasurementData
): string {
  const typeId = getAnnotationTypeId(measurement.type);
  return typeId.startsWith('lateral-cobb') ||
    lateralCobbTypeIds.has(typeId) ||
    ['pi', 'pt', 'tpa'].includes(typeId)
    ? '侧位X光片'
    : '正位X光片';
}

function calculateResolvedMeasurement(
  resolvedMeasurement: ResolvedVariableMeasurement,
  context: CalculationContext
): MeasurementResult[] {
  switch (resolvedMeasurement.kind) {
    case 'avt': {
      const value = calculateAvtValue(resolvedMeasurement.measurement, context);
      return value
        ? [{ name: 'AVT', value: value.replace(/mm$/, ''), unit: 'mm' }]
        : [];
    }
    case 'cobb':
      return calculateCobbResults([...resolvedMeasurement.points]);
    case 'tts':
      return calculateTtsResults(
        [...resolvedMeasurement.interactivePoints],
        context
      );
    case 'pelvic': {
      if (resolvedMeasurement.toolId === 'pi') {
        return calculatePiResultsFromGeometry(resolvedMeasurement.geometry);
      }
      if (resolvedMeasurement.toolId === 'pt') {
        return calculatePtResultsFromGeometry(resolvedMeasurement.geometry);
      }
      if (!resolvedMeasurement.t1Points) return [];
      const t1Center = getVertebraCenterGeometry(
        resolvedMeasurement.t1Points
      ).center;
      return calculateTpaResultsFromGeometry(
        t1Center,
        resolvedMeasurement.geometry
      );
    }
  }
}

export function calculateMeasurementResults(
  measurement: MeasurementData,
  context: CalculationContext
): MeasurementCalculationOutcome {
  const typeId = normalizedCalculationTypeId(measurement.type);
  const resolution = resolveVariableMeasurement(measurement, {
    examType: context.examType ?? inferMeasurementResolverExamType(measurement),
  });

  if (resolution.status === 'invalid') {
    return { status: 'invalid', typeId, reason: resolution.reason };
  }
  if (resolution.status === 'resolved') {
    return toOutcome(
      typeId,
      calculateResolvedMeasurement(resolution.value, context)
    );
  }
  return calculateMeasurementTypeResults(
    measurement.type,
    measurement.points,
    context
  );
}
