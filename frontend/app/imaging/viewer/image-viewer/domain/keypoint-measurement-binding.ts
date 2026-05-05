import { isAuxiliaryTool } from '../catalog/auxiliary';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '../catalog/shared/annotation-config';
import { MeasurementData, MeasurementProjectionBinding, Point } from '../types';
import {
  KeypointAnnotation,
  isAnteriorExamType,
  isLateralExamType,
  upsertKeypoint,
} from './keypoint-state';
import { resolveMeasurementKeypointIds } from './measurement-keypoint-selection';

export interface ManualMeasurementKeypointResult {
  keypoints: KeypointAnnotation[];
  keypointIds: string[];
}

type ToolPointMap = Record<string, string[]>;

const AP_TOOL_POINT_MAP: ToolPointMap = {
  't1-tilt': ['T1-1', 'T1-2'],
  ca: ['CR', 'CL'],
  po: ['IR', 'IL'],
  css: ['SR', 'SL'],
  ts: ['C7-1', 'C7-2', 'C7-3', 'C7-4', 'SL', 'SR'],
};

const LATERAL_TOOL_POINT_MAP: ToolPointMap = {
  't1-slope': ['T1-1', 'T1-2'],
  cl: ['C2-3', 'C2-4', 'C7-3', 'C7-4'],
  'tk-t2-t5': ['T2-1', 'T2-2', 'T5-3', 'T5-4'],
  'tk-t5-t12': ['T5-1', 'T5-2', 'T12-3', 'T12-4'],
  't10-l2': ['T10-1', 'T10-2', 'L2-3', 'L2-4'],
  'll-l1-s1': ['L1-1', 'L1-2', 'S1-1', 'S1-2'],
  'll-l1-l4': ['L1-1', 'L1-2', 'L4-3', 'L4-4'],
  'll-l4-s1': ['L4-1', 'L4-2', 'S1-1', 'S1-2'],
  tpa: ['T1-1', 'T1-2', 'T1-3', 'T1-4', 'CFH', 'S1-1', 'S1-2'],
  sva: ['C7-1', 'C7-2', 'C7-3', 'C7-4', 'S1-2'],
  pi: ['CFH', 'S1-1', 'S1-2'],
  pt: ['CFH', 'S1-1', 'S1-2'],
  ss: ['S1-1', 'S1-2'],
};

const MANUAL_AUXILIARY_MEASUREMENT_TYPES = new Set(['lld']);

export function isAuxiliaryAnnotation(measurement: MeasurementData): boolean {
  const typeId = getAnnotationTypeId(measurement.type);
  if (MANUAL_AUXILIARY_MEASUREMENT_TYPES.has(typeId)) return true;
  if (isAuxiliaryTool(typeId)) return true;
  return getAnnotationConfig(typeId)?.category === 'auxiliary';
}

export function isMedicalProjection(measurement: MeasurementData): boolean {
  return !isAuxiliaryAnnotation(measurement);
}

export function getManualKeypointIdsForTool(
  toolType: string,
  examType: string
): string[] {
  const toolId = getAnnotationTypeId(toolType);
  if (isAnteriorExamType(examType)) return AP_TOOL_POINT_MAP[toolId] ?? [];
  if (isLateralExamType(examType)) return LATERAL_TOOL_POINT_MAP[toolId] ?? [];
  return [];
}

export function applyManualMeasurementPointsToKeypoints(
  currentKeypoints: KeypointAnnotation[],
  toolType: string,
  points: Point[],
  examType: string
): ManualMeasurementKeypointResult | null {
  const keypointIds = getManualKeypointIdsForTool(toolType, examType);
  if (keypointIds.length === 0 || points.length < keypointIds.length) {
    return null;
  }

  const nextKeypoints = keypointIds.reduce(
    (acc, keypointId, index) =>
      upsertKeypoint(acc, {
        id: keypointId,
        point: points[index],
        source: 'manual',
        confidence: 1,
      }),
    currentKeypoints
  );

  return {
    keypoints: nextKeypoints,
    keypointIds,
  };
}

function makeDerivedMeasurement(toolId: string, points: Point[]): MeasurementData | null {
  const config = getAnnotationConfig(toolId);
  if (!config) return null;

  const type = config.name;
  return {
    id: `vertebrae-derived-${type.toLowerCase().replace(/[\s/]+/g, '-')}`,
    type,
    value: '',
    points,
    description: `[关键点推导] ${type}`,
  };
}

export function deriveDirectMeasurementProjectionsFromKeypoints(
  keypoints: KeypointAnnotation[],
  examType: string
): MeasurementData[] {
  const pointMap = isAnteriorExamType(examType)
    ? AP_TOOL_POINT_MAP
    : isLateralExamType(examType)
      ? LATERAL_TOOL_POINT_MAP
      : null;
  if (!pointMap) return [];

  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint.point]));
  return Object.entries(pointMap)
    .map(([toolId, keypointIds]) => {
      const points = keypointIds.map(keypointId => byId.get(keypointId));
      if (!points.every(Boolean)) return null;
      return makeDerivedMeasurement(toolId, points as Point[]);
    })
    .filter((measurement): measurement is MeasurementData => measurement !== null);
}

export function buildMeasurementProjectionBinding(
  measurement: MeasurementData
): MeasurementProjectionBinding | null {
  const typeId = getAnnotationTypeId(measurement.type);
  if (
    typeId === 'cobb' &&
    measurement.upperVertebra &&
    measurement.lowerVertebra
  ) {
    return {
      id: measurement.id,
      type: 'cobb',
      upperVertebra: measurement.upperVertebra,
      lowerVertebra: measurement.lowerVertebra,
      apexVertebra: measurement.apexVertebra ?? null,
    };
  }
  if (
    typeId === 'tts' &&
    measurement.upperVertebra &&
    measurement.lowerVertebra
  ) {
    return {
      id: measurement.id,
      type: 'tts',
      upperVertebra: measurement.upperVertebra,
      lowerVertebra: measurement.lowerVertebra,
      apexVertebra: null,
    };
  }
  if (typeId === 'avt' && measurement.apexVertebra) {
    return {
      id: measurement.id,
      type: 'avt',
      upperVertebra: null,
      lowerVertebra: null,
      apexVertebra: measurement.apexVertebra,
    };
  }
  if (typeId === 'vertebra-center' && measurement.upperVertebra) {
    return {
      id: measurement.id,
      type: 'vertebra-center',
      upperVertebra: measurement.upperVertebra,
      lowerVertebra: null,
      apexVertebra: null,
    };
  }
  return null;
}

export function upsertMeasurementProjectionBinding(
  bindings: MeasurementProjectionBinding[],
  binding: MeasurementProjectionBinding
): MeasurementProjectionBinding[] {
  return [...bindings.filter(item => item.id !== binding.id), binding];
}

export function getExclusiveKeypointsForMeasurementDelete(
  measurement: MeasurementData,
  allMeasurements: MeasurementData[],
  keypoints: KeypointAnnotation[]
): string[] {
  const targetIds = resolveMeasurementKeypointIds(measurement, keypoints);
  if (targetIds.length === 0) return [];

  const usedByOther = new Set<string>();
  allMeasurements
    .filter(item => item.id !== measurement.id)
    .filter(isMedicalProjection)
    .forEach(item => {
      resolveMeasurementKeypointIds(item, keypoints).forEach(keypointId => {
        usedByOther.add(keypointId);
      });
    });

  return targetIds.filter(keypointId => !usedByOther.has(keypointId));
}
