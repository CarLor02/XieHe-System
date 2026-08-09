import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';

import type { MeasurementKeypointBindingRule } from '../../domain/binding-rule-types';

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

/** 根据指定绑定规则创建测量候选；调用方负责决定规则的派生范围。 */
export function deriveFixedMeasurements({
  rules,
  keypoints,
  calculationContext,
}: {
  rules: readonly MeasurementKeypointBindingRule[];
  keypoints: KeypointAnnotation[];
  calculationContext: CalculationContext;
}): MeasurementData[] {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));

  return rules
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
}
