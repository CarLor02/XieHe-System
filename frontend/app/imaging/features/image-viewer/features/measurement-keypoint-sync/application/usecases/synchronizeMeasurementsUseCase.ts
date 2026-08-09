import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  getCobbSequenceNumber,
  getMaxCobbSequenceNumber,
} from '@xiehe/imaging-core/measurements';
import {
  keypointsToDerivedLayer,
  type KeypointAnnotation,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  isBendingExamType,
  isLateralExamType,
} from '@xiehe/imaging-core/anatomy';
import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

import {
  buildBoundMeasurementPointsForMeasurement,
  getAutoDeriveMeasurementKeypointBindingRules,
  getMeasurementKeypointBindingRuleForMeasurement,
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
import { deriveFixedMeasurements } from './deriveFixedMeasurementsUseCase';
import { derivePelvicMeasurements } from './derivePelvicMeasurementsUseCase';
import { orderDerivedMeasurementsByBindingRules } from './orderDerivedMeasurementsByBindingRules';

const DYNAMIC_PELVIC_RULE_IDS = new Set(['pi', 'pt', 'tpa']);

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
  previousMeasurements = [],
}: {
  keypoints: KeypointAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  examType: string;
  calculationContext: CalculationContext;
  previousMeasurements?: readonly MeasurementData[];
}): MeasurementData[] {
  const derivedLayer = keypointsToDerivedLayer(keypoints, examType);
  const autoCobbMeasurements = isBendingExamType(examType)
    ? []
    : deriveAllMeasurements(derivedLayer, cfhAnnotation, examType)
        .filter(isCobbMeasurement)
        .map(measurement => ({
          ...measurement,
          value: calculateMeasurementValue(
            measurement.type,
            measurement.points,
            calculationContext
          ),
        }));
  const autoDeriveRules =
    getAutoDeriveMeasurementKeypointBindingRules(examType);
  const fixedMeasurements = deriveFixedMeasurements({
    rules: autoDeriveRules.filter(
      rule => !DYNAMIC_PELVIC_RULE_IDS.has(rule.typeId)
    ),
    keypoints,
    calculationContext,
  });
  const pelvicMeasurements = isLateralExamType(examType)
    ? derivePelvicMeasurements({
        keypoints,
        previousMeasurements,
        calculationContext,
      })
    : [];
  const orderedMeasurements = orderDerivedMeasurementsByBindingRules(
    autoDeriveRules,
    [...fixedMeasurements, ...pelvicMeasurements]
  );

  return [...orderedMeasurements, ...autoCobbMeasurements];
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
    pelvicMetadata: measurement.pelvicMetadata ?? candidate.pelvicMetadata,
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
    previousMeasurements,
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
    previousMeasurements,
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

      const bindingRule =
        getMeasurementKeypointBindingRuleForMeasurement(measurement);
      if (bindingRule) {
        const points = buildBoundMeasurementPointsForMeasurement(
          measurement,
          keypoints
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
          pelvicMetadata:
            measurement.pelvicMetadata ??
            candidateMaps.byType.get(bindingRule.typeId)?.pelvicMetadata,
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
