import {
  CalculationContext,
  getAnnotationTypeId,
} from '@/app/imaging/viewer/image-viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue } from '@/app/imaging/viewer/image-viewer/features/measurements/domain/annotation-calculation';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/viewer/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/viewer/image-viewer/shared/types';
import {
  deleteKeypoint,
  KeypointAnnotation,
  keypointsToDerivedLayer,
} from '../domain/keypoint-state';
import {
  deriveAllMeasurements,
  DERIVED_ID_PREFIX,
} from '../domain/vertebrae-derive';

export function areKeypointsEqual(
  left: KeypointAnnotation[],
  right: KeypointAnnotation[]
): boolean {
  if (left.length !== right.length) return false;

  const sortedLeft = [...left].sort((a, b) => a.id.localeCompare(b.id));
  const sortedRight = [...right].sort((a, b) => a.id.localeCompare(b.id));

  return sortedLeft.every((item, index) => {
    const other = sortedRight[index];
    return (
      item.id === other.id &&
      item.source === other.source &&
      item.confidence === other.confidence &&
      item.point.x === other.point.x &&
      item.point.y === other.point.y
    );
  });
}

export function isDerivedCobbMeasurement(measurement: MeasurementData): boolean {
  return (
    measurement.id.startsWith(`${DERIVED_ID_PREFIX}cobb-`) &&
    getAnnotationTypeId(measurement.type) === 'cobb' &&
    Boolean(measurement.upperVertebra && measurement.lowerVertebra)
  );
}

export function removeKeypointsById(
  currentKeypoints: KeypointAnnotation[],
  keypointIds: string[]
): KeypointAnnotation[] {
  return keypointIds.reduce(
    (nextKeypoints, keypointId) => deleteKeypoint(nextKeypoints, keypointId),
    currentKeypoints
  );
}

export function findDerivedVertebra(
  layer: VertebraAnnotation[],
  label: string
): VertebraAnnotation | undefined {
  return layer.find(annotation => annotation.label === label);
}

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
  apexVertebra,
  keypoints,
  calculationContext,
}: {
  apexVertebra: string;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
}): MeasurementData | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const sl = byId.get('SL');
  const sr = byId.get('SR');
  if (!sl || !sr) return null;

  const layer = keypointsToDerivedLayer(keypoints, '正位X光片');
  const apex = findDerivedVertebra(layer, apexVertebra);
  if (!apex) return null;

  const [tl, tr, bl, br] = apex.corners;
  const points = [tl, tr, bl, br, sr.point, sl.point];

  return {
    id: 'ap-keypoint-avt',
    type: 'avt',
    value: calculateMeasurementValue('avt', points, calculationContext),
    points,
    description: `AVT ${apexVertebra}`,
    upperVertebra: null,
    lowerVertebra: null,
    apexVertebra,
  };
}

export function createCobbMeasurement({
  upperVertebra,
  lowerVertebra,
  keypoints,
  examType,
  calculationContext,
  existingMeasurement,
}: {
  upperVertebra: string;
  lowerVertebra: string;
  keypoints: KeypointAnnotation[];
  examType: string;
  calculationContext: CalculationContext;
  existingMeasurement?: MeasurementData;
}): MeasurementData | null {
  if (upperVertebra === lowerVertebra) return null;

  const layer = keypointsToDerivedLayer(keypoints, examType);
  const upper = findDerivedVertebra(layer, upperVertebra);
  const lower = findDerivedVertebra(layer, lowerVertebra);
  if (!upper || !lower) return null;

  const points = [
    upper.corners[0],
    upper.corners[1],
    lower.corners[2],
    lower.corners[3],
  ];
  const idSuffix = `${upperVertebra}-${lowerVertebra}`.toLowerCase();
  const type = existingMeasurement?.type ?? 'Cobb';

  return {
    id:
      existingMeasurement?.id ?? `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
    type,
    value: calculateMeasurementValue(type, points, calculationContext),
    points,
    description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: existingMeasurement?.apexVertebra ?? null,
  };
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
  return createCobbMeasurement({
    upperVertebra: measurement.upperVertebra,
    lowerVertebra: measurement.lowerVertebra,
    keypoints,
    examType,
    calculationContext,
    existingMeasurement: measurement,
  });
}

export function deriveKeypointMeasurements({
  keypoints,
  cfhAnnotation,
  examType,
  calculationContext,
}: {
  keypoints: KeypointAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  examType: string;
  calculationContext: CalculationContext;
}): MeasurementData[] {
  const derivedLayer = keypointsToDerivedLayer(keypoints, examType);
  return deriveAllMeasurements(derivedLayer, cfhAnnotation, examType).map(
    measurement => ({
      ...measurement,
      value: calculateMeasurementValue(
        measurement.type,
        measurement.points,
        calculationContext
      ),
    })
  );
}

export function rebuildKeypointMeasurements({
  previousMeasurements,
  keypoints,
  cfhAnnotation,
  examType,
  isLateralView,
  calculationContext,
  aiMeasurementIds,
}: {
  previousMeasurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  examType: string;
  isLateralView: boolean;
  calculationContext: CalculationContext;
  aiMeasurementIds: Set<string>;
}): MeasurementData[] {
  const boundCobbIds = new Set(
    previousMeasurements
      .filter(isDerivedCobbMeasurement)
      .map(measurement => measurement.id)
  );
  const hasExistingDerivedCobb = boundCobbIds.size > 0;
  const derivedWithValues = deriveKeypointMeasurements({
    keypoints,
    cfhAnnotation,
    examType,
    calculationContext,
  }).filter(
    measurement =>
      !isDerivedCobbMeasurement(measurement) ||
      (!hasExistingDerivedCobb && !boundCobbIds.has(measurement.id))
  );

  const boundCobbMeasurements = previousMeasurements
    .filter(isDerivedCobbMeasurement)
    .map(measurement =>
      createBoundCobbMeasurement({
        measurement,
        keypoints,
        examType,
        calculationContext,
      })
    )
    .filter(
      (measurement): measurement is MeasurementData => measurement !== null
    );

  const centerMeasurements = previousMeasurements
    .filter(
      measurement =>
        measurement.type === 'vertebra-center' && measurement.upperVertebra
    )
    .map(measurement =>
      createVertebraCenterMeasurement({
        vertebra: measurement.upperVertebra!,
        keypoints,
        examType,
        isLateralView,
        calculationContext,
      })
    )
    .filter(
      (measurement): measurement is MeasurementData => measurement !== null
    );

  const existingTts = previousMeasurements.find(
    measurement => measurement.id === 'ap-keypoint-tts'
  );
  const ttsMeasurement =
    existingTts?.upperVertebra && existingTts.lowerVertebra
      ? createTtsMeasurement({
          upperVertebra: existingTts.upperVertebra,
          lowerVertebra: existingTts.lowerVertebra,
          keypoints,
          calculationContext,
        })
      : null;
  const existingAvt = previousMeasurements.find(
    measurement => measurement.id === 'ap-keypoint-avt'
  );
  const avtMeasurement = existingAvt?.apexVertebra
    ? createAvtMeasurement({
        apexVertebra: existingAvt.apexVertebra,
        keypoints,
        calculationContext,
      })
    : null;

  return filterUniqueAnnotationDuplicates([
    ...previousMeasurements.filter(
      measurement =>
        !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
        !aiMeasurementIds.has(measurement.id) &&
        !(
          measurement.type === 'vertebra-center' &&
          measurement.upperVertebra
        ) &&
        measurement.id !== 'ap-keypoint-avt' &&
        measurement.id !== 'ap-keypoint-tts'
    ),
    ...derivedWithValues,
    ...boundCobbMeasurements,
    ...centerMeasurements,
    ...(avtMeasurement ? [avtMeasurement] : []),
    ...(ttsMeasurement ? [ttsMeasurement] : []),
  ]);
}

export function buildDerivedMeasurementsFromLayer({
  layer,
  cfhAnnotation,
  examType,
  calculationContext,
}: {
  layer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  examType: string;
  calculationContext: CalculationContext;
}): MeasurementData[] {
  return deriveAllMeasurements(layer, cfhAnnotation, examType).map(
    measurement => ({
      ...measurement,
      value: calculateMeasurementValue(
        measurement.type,
        measurement.points,
        calculationContext
      ),
    })
  );
}
