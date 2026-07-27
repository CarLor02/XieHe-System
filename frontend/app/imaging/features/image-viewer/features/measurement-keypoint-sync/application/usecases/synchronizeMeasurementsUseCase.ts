import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  getCobbSequenceNumber,
  getMaxCobbSequenceNumber,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb';
import {
  keypointsToDerivedLayer,
  type KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

import {
  buildBoundMeasurementPoints,
  getAutoDeriveMeasurementKeypointBindingRules,
  getMeasurementKeypointBindingRule,
} from '../../domain/measurement-keypoint-binding';
import {
  isBoundAvtMeasurement,
  isCobbMeasurement,
  isDerivedCobbMeasurement,
} from '../../domain/measurement-keypoint-query';
import {
  deriveAllMeasurements,
  DERIVED_ID_PREFIX,
} from '../../domain/vertebrae-derive';
import {
  createBoundCobbMeasurement,
  createTtsMeasurement,
  createVertebraCenterMeasurement,
  rebuildAvtMeasurement,
} from './createBoundMeasurementUseCase';

const DERIVED_MEASUREMENT_TYPE_BY_RULE_ID: Record<string, string> = {
  't1-tilt': 'T1 Tilt',
  ca: 'CA',
  po: 'PO',
  css: 'CSS',
  ts: 'TS',
  'hemipelvic-width-ratio': 'hemipelvic-width-ratio',
  't1-slope': 'T1 Slope',
  cl: 'C2-C7 CL',
  'tk-t2-t5': 'TK T2-T5',
  'tk-t5-t12': 'TK T5-T12',
  't10-l2': 'T10-L2',
  'll-l1-s1': 'LL L1-S1',
  'll-l1-l4': 'LL L1-L4',
  'll-l4-s1': 'LL L4-S1',
  sva: 'SVA',
  tpa: 'TPA',
  pi: 'PI',
  pt: 'PT',
  ss: 'SS',
};

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

/** 根据当前关键点生成可自动派生的测量候选项。 */
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
  const autoCobbMeasurements = deriveAllMeasurements(
    derivedLayer,
    cfhAnnotation,
    examType
  )
    .filter(isCobbMeasurement)
    .map(measurement => ({
      ...measurement,
      value: calculateMeasurementValue(
        measurement.type,
        measurement.points,
        calculationContext
      ),
    }));
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const fixedMeasurements = getAutoDeriveMeasurementKeypointBindingRules(
    examType
  )
    .map((rule): MeasurementData | null => {
      const points = rule.buildMeasurementPoints(byId);
      if (!points) return null;
      const legacyIdType =
        rule.typeId === 'po'
          ? 'pelvic'
          : rule.typeId === 'css'
            ? 'sacral'
            : rule.typeId;
      return {
        id: `vertebrae-derived-${legacyIdType}`,
        type: DERIVED_MEASUREMENT_TYPE_BY_RULE_ID[rule.typeId] ?? rule.typeId,
        value: calculateMeasurementValue(
          rule.typeId,
          points,
          calculationContext
        ),
        points,
        description: `[推导] ${rule.typeId}`,
        keypointSynced: true,
      };
    })
    .filter(
      (measurement): measurement is MeasurementData => measurement !== null
    );

  return [...fixedMeasurements, ...autoCobbMeasurements];
}

function getDerivedCandidateKey(measurement: MeasurementData): string {
  return getAnnotationTypeId(measurement.type);
}

function buildDerivedCandidateMaps(measurements: MeasurementData[]) {
  return {
    byId: new Map(
      measurements.map(measurement => [measurement.id, measurement])
    ),
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

/**
 * AI 检测完成后的初始派生入口。
 *
 * 只有该流程允许从全量关键点创建 Cobb；普通点位移动只重算已有项。
 */
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
      !isDerivedCobbMeasurement(measurement) ||
      (!hasExistingDerivedCobb && !boundCobbIds.has(measurement.id))
  );

  const retainedPreviousMeasurements = previousMeasurements.filter(
    measurement =>
      !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
      !isDerivedCobbMeasurement(measurement) &&
      !aiMeasurementIds.has(measurement.id) &&
      !(measurement.type === 'vertebra-center' && measurement.upperVertebra) &&
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
      rebuildAvtMeasurement({
        measurement,
        keypoints,
        calculationContext,
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

/** 关键点变更后仅重算当前内存中已经存在或已经绑定的测量项。 */
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
        return rebuildAvtMeasurement({
          measurement,
          keypoints,
          calculationContext,
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
            isKeypointDrivenUniqueMeasurement(measurement, aiMeasurementIds)
            ? null
            : measurement;
        }

        return {
          ...measurement,
          points,
          value: calculateMeasurementValue(
            bindingRule.typeId,
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

/**
 * 单点增删后的唯一测量项同步入口。
 *
 * 该流程可补齐全局唯一测量项，但明确排除 Cobb，避免恢复用户删除的 Cobb。
 */
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
