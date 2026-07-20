import {
  CalculationContext,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-calculation';
import { LATERAL_COBB_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements/cobb';
import {
  getCobbSequenceNumber,
  getMaxCobbSequenceNumber,
  getNextCobbType,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-cobb-sequence';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  deleteKeypoint,
  isLateralExamType,
  KeypointAnnotation,
  keypointsToDerivedLayer,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { getLateralCobbEndpointPointIds } from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-derive';
import {
  deriveAllMeasurements,
  DERIVED_ID_PREFIX,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/vertebrae-derive';
import {
  buildBoundMeasurementPoints,
  getMeasurementKeypointBindingRule,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-keypoint-binding';

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
  const isKeypointBoundCobb =
    measurement.id.startsWith(`${DERIVED_ID_PREFIX}cobb-`) ||
    measurement.keypointSynced === true;
  return (
    isKeypointBoundCobb &&
    isCobbMeasurement(measurement) &&
    Boolean(measurement.upperVertebra && measurement.lowerVertebra)
  );
}

function normalizeVertebraLabel(label: string): string {
  return label.trim().toUpperCase();
}

export function isCobbMeasurement(measurement: MeasurementData): boolean {
  const typeId = getAnnotationTypeId(measurement.type);
  return (
    typeId === 'cobb' ||
    typeId === 'lateral-cobb' ||
    /^(?:lateral-)?cobb\d+$/i.test(typeId)
  );
}

export function isBoundAvtMeasurement(
  measurement: MeasurementData
): boolean {
  return (
    getAnnotationTypeId(measurement.type) === 'avt' &&
    Boolean(measurement.apexVertebra)
  );
}

export function hasAvtMeasurementForApex(
  measurements: MeasurementData[],
  apexVertebra: string
): boolean {
  const normalizedApex = normalizeVertebraLabel(apexVertebra);
  return measurements.some(
    measurement =>
      isBoundAvtMeasurement(measurement) &&
      normalizeVertebraLabel(measurement.apexVertebra!) === normalizedApex
  );
}

export function hasCobbMeasurementForEndpoints(
  measurements: MeasurementData[],
  upperVertebra: string,
  lowerVertebra: string
): boolean {
  const normalizedUpper = normalizeVertebraLabel(upperVertebra);
  const normalizedLower = normalizeVertebraLabel(lowerVertebra);
  return measurements.some(
    measurement =>
      isCobbMeasurement(measurement) &&
      measurement.upperVertebra != null &&
      measurement.lowerVertebra != null &&
      normalizeVertebraLabel(measurement.upperVertebra) === normalizedUpper &&
      normalizeVertebraLabel(measurement.lowerVertebra) === normalizedLower
  );
}

function applyCobbSequenceTypes(
  measurements: MeasurementData[],
  startingCobbSequenceNumber: number,
  calculationContext: CalculationContext
): MeasurementData[] {
  let cobbSequenceNumber = Math.max(
    startingCobbSequenceNumber,
    getMaxCobbSequenceNumber(measurements)
  );

  return measurements.map(measurement => {
    if (!isDerivedCobbMeasurement(measurement)) {
      return measurement;
    }

    const existingSequenceNumber = getCobbSequenceNumber(measurement.type);
    if (existingSequenceNumber !== null) {
      return {
        ...measurement,
        value:
          calculateMeasurementValue(
            measurement.type,
            measurement.points,
            calculationContext
          ) || measurement.value,
      };
    }

    cobbSequenceNumber += 1;
    const type = `cobb${cobbSequenceNumber}`;
    return {
      ...measurement,
      type,
      value: calculateMeasurementValue(
        type,
        measurement.points,
        calculationContext
      ),
    };
  });
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

function findCobbEndpointPoints(
  keypoints: KeypointAnnotation[],
  upperVertebra: string,
  lowerVertebra: string
): [Point, Point, Point, Point] | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const upperLeft = byId.get(`${upperVertebra}-1`);
  const upperRight = byId.get(`${upperVertebra}-2`);
  const lowerLeft = byId.get(`${lowerVertebra}-3`);
  const lowerRight = byId.get(`${lowerVertebra}-4`);

  if (!upperLeft || !upperRight || !lowerLeft || !lowerRight) return null;
  return [
    upperLeft.point,
    upperRight.point,
    lowerLeft.point,
    lowerRight.point,
  ];
}

function findLateralCobbEndpointPoints(
  keypoints: KeypointAnnotation[],
  upperVertebra: string,
  lowerVertebra: string
): [Point, Point, Point, Point] | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const endpointIds = getLateralCobbEndpointPointIds(
    upperVertebra,
    lowerVertebra
  );
  const points = endpointIds.map(keypointId => byId.get(keypointId)?.point);

  if (points.some(point => !point)) return null;
  return points as [Point, Point, Point, Point];
}

function calculateLateralCobbMeasurementValue(
  points: [Point, Point, Point, Point],
  calculationContext: CalculationContext
): string {
  const results = LATERAL_COBB_CONFIG.calculateResults(
    points,
    calculationContext
  );
  if (results.length === 0) return '辅助标注';
  return `${results[0].value}${results[0].unit}`;
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
  existingMeasurement,
}: {
  apexVertebra: string;
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
  existingMeasurement?: MeasurementData;
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
    ...existingMeasurement,
    id:
      existingMeasurement?.id ??
      `ap-keypoint-avt-${apexVertebra.trim().toLowerCase()}`,
    type: existingMeasurement?.type ?? 'avt',
    value: calculateMeasurementValue('avt', points, calculationContext),
    points,
    description: existingMeasurement?.description ?? `AVT ${apexVertebra}`,
    upperVertebra: null,
    lowerVertebra: null,
    apexVertebra,
    keypointSynced: true,
  };
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

  const endpointPoints = findCobbEndpointPoints(
    keypoints,
    upperVertebra,
    lowerVertebra
  );
  const layer = endpointPoints ? [] : keypointsToDerivedLayer(keypoints, examType);
  const upper = endpointPoints ? null : findDerivedVertebra(layer, upperVertebra);
  const lower = endpointPoints ? null : findDerivedVertebra(layer, lowerVertebra);
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
  const type = measurementType ?? existingMeasurement?.type ?? 'Cobb';

  return {
    id:
      measurementId ??
      existingMeasurement?.id ??
      `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
    type,
    value: calculateMeasurementValue(type, points, calculationContext),
    points,
    description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: existingMeasurement?.apexVertebra ?? null,
    keypointSynced: keypointSynced ?? existingMeasurement?.keypointSynced,
  };
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

  const points = findLateralCobbEndpointPoints(
    keypoints,
    upperVertebra,
    lowerVertebra
  );
  if (!points) return null;

  const idSuffix = `${upperVertebra}-${lowerVertebra}`.toLowerCase();
  const type = measurementType ?? existingMeasurement?.type ?? 'Cobb';

  return {
    id:
      measurementId ??
      existingMeasurement?.id ??
      `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
    type,
    value: calculateLateralCobbMeasurementValue(points, calculationContext),
    points,
    description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
    upperVertebra,
    lowerVertebra,
    apexVertebra: existingMeasurement?.apexVertebra ?? null,
    keypointSynced: keypointSynced ?? existingMeasurement?.keypointSynced,
  };
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
    measurement => {
      const isKeypointBound =
        getMeasurementKeypointBindingRule(measurement.type) !== null;
      return {
        ...measurement,
        value: calculateMeasurementValue(
          measurement.type,
          measurement.points,
          calculationContext
        ),
        ...(isKeypointBound ? { keypointSynced: true } : {}),
      };
    }
  );
}

function getDerivedCandidateKey(measurement: MeasurementData): string {
  return getAnnotationTypeId(measurement.type);
}

function buildDerivedCandidateMaps(measurements: MeasurementData[]) {
  return {
    byId: new Map(measurements.map(measurement => [measurement.id, measurement])),
    byType: new Map(
      measurements.map(measurement => [
        getDerivedCandidateKey(measurement),
        measurement,
      ])
    ),
  };
}

function isKeypointDrivenUniqueMeasurement(
  measurement: MeasurementData,
  aiMeasurementIds: Set<string>
): boolean {
  return (
    measurement.id.startsWith(DERIVED_ID_PREFIX) ||
    aiMeasurementIds.has(measurement.id)
  );
}

function recalculateDerivedCandidateMeasurement({
  measurement,
  candidate,
  calculationContext,
}: {
  measurement: MeasurementData;
  candidate: MeasurementData;
  calculationContext: CalculationContext;
}): MeasurementData {
  return {
    ...measurement,
    type: measurement.type,
    points: candidate.points,
    value: calculateMeasurementValue(
      measurement.type,
      candidate.points,
      calculationContext
    ),
    description: measurement.description ?? candidate.description,
    upperVertebra: measurement.upperVertebra ?? candidate.upperVertebra,
    lowerVertebra: measurement.lowerVertebra ?? candidate.lowerVertebra,
    apexVertebra: measurement.apexVertebra ?? candidate.apexVertebra,
  };
}

export function deriveInitialMeasurementsFromKeypoints({
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
      (!isDerivedCobbMeasurement(measurement) ||
        (!hasExistingDerivedCobb && !boundCobbIds.has(measurement.id)))
  );

  const retainedPreviousMeasurements = previousMeasurements.filter(
    measurement =>
      !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
      !isDerivedCobbMeasurement(measurement) &&
      !aiMeasurementIds.has(measurement.id) &&
      !(
        measurement.type === 'vertebra-center' &&
        measurement.upperVertebra
      ) &&
      !isBoundAvtMeasurement(measurement) &&
      measurement.id !== 'ap-keypoint-tts'
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
  const avtMeasurements = previousMeasurements
    .filter(isBoundAvtMeasurement)
    .map(measurement =>
      createAvtMeasurement({
        apexVertebra: measurement.apexVertebra!,
        keypoints,
        calculationContext,
        existingMeasurement: measurement,
      })
    )
    .filter(
      (measurement): measurement is MeasurementData => measurement !== null
    );

  const rebuiltDerivedMeasurements = applyCobbSequenceTypes(
    [...derivedWithValues, ...boundCobbMeasurements],
    getMaxCobbSequenceNumber(retainedPreviousMeasurements),
    calculationContext
  );

  return filterUniqueAnnotationDuplicates([
    ...retainedPreviousMeasurements,
    ...rebuiltDerivedMeasurements,
    ...centerMeasurements,
    ...avtMeasurements,
    ...(ttsMeasurement ? [ttsMeasurement] : []),
  ]);
}

export function recalculateExistingMeasurementsFromKeypoints({
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
  const derivedCandidates = deriveKeypointMeasurements({
    keypoints,
    cfhAnnotation,
    examType,
    calculationContext,
  }).filter(measurement => !isCobbMeasurement(measurement));
  const candidateMaps = buildDerivedCandidateMaps(derivedCandidates);

  const recalculated = previousMeasurements
    .map(measurement => {
      if (isDerivedCobbMeasurement(measurement)) {
        return createBoundCobbMeasurement({
          measurement,
          keypoints,
          examType,
          calculationContext,
        });
      }

      if (measurement.type === 'vertebra-center' && measurement.upperVertebra) {
        return createVertebraCenterMeasurement({
          vertebra: measurement.upperVertebra,
          keypoints,
          examType,
          isLateralView,
          calculationContext,
        });
      }

      if (measurement.id === 'ap-keypoint-tts') {
        return measurement.upperVertebra && measurement.lowerVertebra
          ? createTtsMeasurement({
              upperVertebra: measurement.upperVertebra,
              lowerVertebra: measurement.lowerVertebra,
              keypoints,
              calculationContext,
            })
          : null;
      }

      if (isBoundAvtMeasurement(measurement)) {
        return createAvtMeasurement({
          apexVertebra: measurement.apexVertebra!,
          keypoints,
          calculationContext,
          existingMeasurement: measurement,
        });
      }

      const bindingRule = getMeasurementKeypointBindingRule(measurement.type);
      if (bindingRule) {
        const points = buildBoundMeasurementPoints(
          measurement.type,
          keypoints,
          measurement.points
        );
        if (!points) {
          return measurement.keypointSynced === true ||
            aiMeasurementIds.has(measurement.id)
            ? null
            : measurement;
        }

        return {
          ...measurement,
          points,
          value: calculateMeasurementValue(
            measurement.type,
            points,
            calculationContext
          ),
          keypointSynced: true,
        };
      }

      if (isKeypointDrivenUniqueMeasurement(measurement, aiMeasurementIds)) {
        if (isCobbMeasurement(measurement)) return null;
        const candidate =
          candidateMaps.byId.get(measurement.id) ??
          candidateMaps.byType.get(getDerivedCandidateKey(measurement));
        return candidate
          ? recalculateDerivedCandidateMeasurement({
              measurement,
              candidate,
              calculationContext,
            })
          : null;
      }

      return measurement;
    })
    .filter(
      (measurement): measurement is MeasurementData => measurement !== null
    );

  return filterUniqueAnnotationDuplicates(recalculated);
}

export function syncUniqueMeasurementsAfterKeypointChange({
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
  const recalculated = recalculateExistingMeasurementsFromKeypoints({
    previousMeasurements,
    keypoints,
    cfhAnnotation,
    examType,
    isLateralView,
    calculationContext,
    aiMeasurementIds,
  });
  const existingTypes = new Set(
    recalculated.map(measurement => getDerivedCandidateKey(measurement))
  );
  const additions = deriveKeypointMeasurements({
    keypoints,
    cfhAnnotation,
    examType,
    calculationContext,
  }).filter(measurement => {
    const key = getDerivedCandidateKey(measurement);
    return !isCobbMeasurement(measurement) && !existingTypes.has(key);
  });

  return filterUniqueAnnotationDuplicates([...recalculated, ...additions]);
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
