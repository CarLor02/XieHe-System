import {
  calculateMeasurementDataValue,
  calculateMeasurementValue,
} from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import {
  type AvtTarget,
} from '@xiehe/imaging-core/contracts';
import {
  buildAvtPoints,
  calculateAvtValue,
  createAvtMetadata,
  getAvtMeasurementId,
  getAvtTargetLabel,
  isAvtMetadata,
} from '@xiehe/imaging-core/measurements/ap';
import { resolveCobbEndpointPointIds } from '@xiehe/imaging-core/measurements';
import { getNextCobbType } from '@xiehe/imaging-core/measurements';
import {
  keypointsToDerivedLayer,
  type KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { isLateralExamType } from '@xiehe/imaging-core/anatomy';
import type {
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

import { DERIVED_ID_PREFIX } from '../../domain/vertebrae-derive';

function findDerivedVertebra(
  layer: VertebraAnnotation[],
  label: string
): VertebraAnnotation | undefined {
  return layer.find(annotation => annotation.label === label);
}

function findCobbEndpointPoints(
  keypoints: KeypointAnnotation[],
  endpointIds: readonly [string, string, string, string]
): [Point, Point, Point, Point] | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const points = endpointIds.map(keypointId => byId.get(keypointId)?.point);

  if (points.some(point => !point)) return null;
  return points as [Point, Point, Point, Point];
}

/** 从完整椎体关键点创建一个与关键点绑定的椎体中心测量项。 */
export function createVertebraCenterMeasurement({
  vertebra,
  keypoints,
  examType,
  isLateralView,
  calculationContext,
}: {
  vertebra: string;
  keypoints: KeypointAnnotation[];
  examType: string;
  isLateralView: boolean;
  calculationContext: CalculationContext;
}): MeasurementData | null {
  const layer = keypointsToDerivedLayer(keypoints, examType);
  const annotation = findDerivedVertebra(layer, vertebra);
  if (!annotation) return null;
  const prefix = isLateralView ? 'lateral' : 'ap';

  return {
    id: `${prefix}-keypoint-vertebra-center-${vertebra.toLowerCase()}`,
    type: 'vertebra-center',
    value: calculateMeasurementValue(
      'vertebra-center',
      annotation.corners,
      calculationContext
    ),
    points: annotation.corners,
    description: `椎体中心 ${vertebra}`,
    upperVertebra: vertebra,
    lowerVertebra: null,
    apexVertebra: null,
  };
}

export function createTtsMeasurement({
  upperVertebra,
  lowerVertebra,
  keypoints,
  calculationContext,
}: {
  upperVertebra: string;
  lowerVertebra: string;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
}): MeasurementData | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const sl = byId.get('SL');
  const sr = byId.get('SR');
  if (!sl || !sr) return null;

  const layer = keypointsToDerivedLayer(keypoints, '正位X光片');
  const upper = findDerivedVertebra(layer, upperVertebra);
  const lower = findDerivedVertebra(layer, lowerVertebra);
  if (!upper || !lower) return null;

  const upperCenter = {
    x: upper.corners.reduce((sum, point) => sum + point.x, 0) / 4,
    y: upper.corners.reduce((sum, point) => sum + point.y, 0) / 4,
  };
  const lowerCenter = {
    x: lower.corners.reduce((sum, point) => sum + point.x, 0) / 4,
    y: lower.corners.reduce((sum, point) => sum + point.y, 0) / 4,
  };
  const points = [upperCenter, lowerCenter, sl.point, sr.point];

  return {
    id: 'ap-keypoint-tts',
    type: 'tts',
    value: calculateMeasurementValue('tts', points, calculationContext),
    points,
    description: `TTS ${upperVertebra}-${lowerVertebra}`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: null,
  };
}

export function createAvtMeasurement({
  target,
  keypoints,
  calculationContext,
  existingMeasurement,
  discAnchors,
}: {
  target: AvtTarget;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
  existingMeasurement?: MeasurementData;
  discAnchors?: readonly [Point, Point];
}): MeasurementData | null {
  const byId = new Map(
    keypoints.map(keypoint => [keypoint.id, keypoint.point] as const)
  );
  const metadata = createAvtMetadata(target);
  const existingDiscAnchors =
    target.type === 'disc' && existingMeasurement?.points.length
      ? (existingMeasurement.points.slice(0, 2) as [Point, Point])
      : undefined;
  const points = buildAvtPoints(
    metadata,
    byId,
    discAnchors ?? existingDiscAnchors
  );
  if (!points) return null;

  const measurement: MeasurementData = {
    ...existingMeasurement,
    id: existingMeasurement?.id ?? getAvtMeasurementId(target),
    type: existingMeasurement?.type ?? 'avt',
    value: '',
    points,
    description:
      existingMeasurement?.description ?? `AVT ${getAvtTargetLabel(target)}`,
    upperVertebra: null,
    lowerVertebra: null,
    apexVertebra: target.type === 'vertebra' ? target.vertebra : null,
    avtMetadata: metadata,
    keypointSynced: true,
  };
  measurement.value =
    calculateAvtValue(measurement, calculationContext) ?? measurement.value;
  return measurement;
}

function rebuildLegacyAvtMeasurement({
  measurement,
  keypoints,
  calculationContext,
}: {
  measurement: MeasurementData;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
}): MeasurementData | null {
  if (!measurement.apexVertebra) return null;
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const sr = byId.get('SR');
  const sl = byId.get('SL');
  const layer = keypointsToDerivedLayer(keypoints, '正位X光片');
  const apex = findDerivedVertebra(layer, measurement.apexVertebra);
  if (!apex || !sr || !sl) return null;

  // 历史兼容：旧 AVT 没有 metadata，始终保持原六点 CSVL 语义，
  // 不能按当前层级规则将 T2-T11 静默迁移成 C7PL。
  const points = [...apex.corners, sr.point, sl.point];
  const rebuilt = { ...measurement, points };
  return {
    ...rebuilt,
    value: calculateAvtValue(rebuilt, calculationContext) ?? measurement.value,
  };
}

export function rebuildAvtMeasurement({
  measurement,
  keypoints,
  calculationContext,
}: {
  measurement: MeasurementData;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
}): MeasurementData | null {
  if (!isAvtMetadata(measurement.avtMetadata)) {
    return rebuildLegacyAvtMeasurement({
      measurement,
      keypoints,
      calculationContext,
    });
  }

  return createAvtMeasurement({
    target: measurement.avtMetadata.target,
    keypoints,
    calculationContext,
    existingMeasurement: measurement,
  });
}

export function createCobbMeasurement({
  upperVertebra,
  lowerVertebra,
  keypoints,
  examType,
  calculationContext,
  existingMeasurement,
  measurementType,
  measurementId,
  keypointSynced,
}: {
  upperVertebra: string;
  lowerVertebra: string;
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
  existingMeasurement?: MeasurementData;
  measurementType?: string;
  measurementId?: string;
  keypointSynced?: boolean;
}): MeasurementData | null {
  if (upperVertebra === lowerVertebra) return null;

  const type = measurementType ?? existingMeasurement?.type ?? 'Cobb';
  const endpointIds = resolveCobbEndpointPointIds(
    { type, upperVertebra, lowerVertebra },
    { examType }
  );
  if (!endpointIds) return null;

  const endpointPoints = findCobbEndpointPoints(keypoints, endpointIds);
  const layer = endpointPoints
    ? []
    : keypointsToDerivedLayer(keypoints, examType);
  const upper = endpointPoints
    ? null
    : findDerivedVertebra(layer, upperVertebra);
  const lower = endpointPoints
    ? null
    : findDerivedVertebra(layer, lowerVertebra);
  if (!endpointPoints && (!upper || !lower)) return null;

  const points =
    endpointPoints ??
    ([
      upper!.corners[0],
      upper!.corners[1],
      lower!.corners[2],
      lower!.corners[3],
    ] as [Point, Point, Point, Point]);
  const idSuffix = `${upperVertebra}-${lowerVertebra}`.toLowerCase();

  const measurement: MeasurementData = {
    id:
      measurementId ??
      existingMeasurement?.id ??
      `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
    type,
    value: '',
    points,
    description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: existingMeasurement?.apexVertebra ?? null,
    keypointSynced: keypointSynced ?? existingMeasurement?.keypointSynced,
  };
  measurement.value = calculateMeasurementDataValue(measurement, {
    ...calculationContext,
    examType,
  });
  return measurement;
}

export function createLateralCobbMeasurement({
  upperVertebra,
  lowerVertebra,
  keypoints,
  existingMeasurement,
  measurementType,
  measurementId,
  keypointSynced,
  calculationContext,
}: {
  upperVertebra: string;
  lowerVertebra: string;
  keypoints: KeypointAnnotation[];
  existingMeasurement?: MeasurementData;
  measurementType?: string;
  measurementId?: string;
  keypointSynced?: boolean;
  calculationContext: CalculationContext;
}): MeasurementData | null {
  if (upperVertebra === lowerVertebra) return null;

  const type = measurementType ?? existingMeasurement?.type ?? 'Cobb';
  const endpointIds = resolveCobbEndpointPointIds(
    { type, upperVertebra, lowerVertebra },
    { examType: '侧位X光片' }
  );
  if (!endpointIds) return null;
  const points = findCobbEndpointPoints(keypoints, endpointIds);
  if (!points) return null;

  const idSuffix = `${upperVertebra}-${lowerVertebra}`.toLowerCase();
  const measurement: MeasurementData = {
    id:
      measurementId ??
      existingMeasurement?.id ??
      `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
    type,
    value: '',
    points,
    description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: existingMeasurement?.apexVertebra ?? null,
    keypointSynced: keypointSynced ?? existingMeasurement?.keypointSynced,
  };
  measurement.value = calculateMeasurementDataValue(measurement, {
    ...calculationContext,
    examType: '侧位X光片',
  });
  return measurement;
}

export function createNextBoundCobbMeasurement({
  upperVertebra,
  lowerVertebra,
  keypoints,
  examType,
  calculationContext,
  existingMeasurements,
}: {
  upperVertebra: string;
  lowerVertebra: string;
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
  existingMeasurements: MeasurementData[];
}): MeasurementData | null {
  if (isLateralExamType(examType)) {
    return createLateralCobbMeasurement({
      upperVertebra,
      lowerVertebra,
      keypoints,
      calculationContext,
      measurementType: getNextCobbType(existingMeasurements, 'lateral-cobb'),
      keypointSynced: true,
    });
  }

  return createCobbMeasurement({
    upperVertebra,
    lowerVertebra,
    keypoints,
    examType,
    calculationContext,
    measurementType: getNextCobbType(existingMeasurements),
    keypointSynced: true,
  });
}

export function createBoundCobbMeasurement({
  measurement,
  keypoints,
  examType,
  calculationContext,
}: {
  measurement: MeasurementData;
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
}): MeasurementData | null {
  if (!measurement.upperVertebra || !measurement.lowerVertebra) return null;
  if (isLateralExamType(examType)) {
    return createLateralCobbMeasurement({
      upperVertebra: measurement.upperVertebra,
      lowerVertebra: measurement.lowerVertebra,
      keypoints,
      calculationContext,
      existingMeasurement: measurement,
    });
  }

  return createCobbMeasurement({
    upperVertebra: measurement.upperVertebra,
    lowerVertebra: measurement.lowerVertebra,
    keypoints,
    examType,
    calculationContext,
    existingMeasurement: measurement,
  });
}
