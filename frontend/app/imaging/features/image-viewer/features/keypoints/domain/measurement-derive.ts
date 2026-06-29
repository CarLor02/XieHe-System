import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import { getLateralKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  isAnteriorExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
  getMeasurementDeriveVertebraOrder,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/vertebra-order';

export {
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
  getMeasurementDeriveVertebraOrder,
};

export interface LateralNamedCobbMeasurementRule {
  name: string;
  upperVertebra: string;
  lowerVertebra: string;
  endpointPointIds: [string, string, string, string];
}

export const LATERAL_NAMED_COBB_MEASUREMENT_RULES: LateralNamedCobbMeasurementRule[] =
  [
    {
      name: 'C2-C7 CL',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      endpointPointIds: ['C2-3', 'C2-4', 'C7-3', 'C7-4'],
    },
    {
      name: 'TK T2-T5',
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
      endpointPointIds: ['T2-1', 'T2-2', 'T5-3', 'T5-4'],
    },
    {
      name: 'TK T5-T12',
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
      endpointPointIds: ['T5-1', 'T5-2', 'T12-3', 'T12-4'],
    },
    {
      name: 'T10-L2',
      upperVertebra: 'T10',
      lowerVertebra: 'L2',
      endpointPointIds: ['T10-1', 'T10-2', 'L2-3', 'L2-4'],
    },
    {
      name: 'LL L1-S1',
      upperVertebra: 'L1',
      lowerVertebra: 'S1',
      endpointPointIds: ['L1-1', 'L1-2', 'S1-1', 'S1-2'],
    },
    {
      name: 'LL L1-L4',
      upperVertebra: 'L1',
      lowerVertebra: 'L4',
      endpointPointIds: ['L1-1', 'L1-2', 'L4-3', 'L4-4'],
    },
    {
      name: 'LL L4-S1',
      upperVertebra: 'L4',
      lowerVertebra: 'S1',
      endpointPointIds: ['L4-1', 'L4-2', 'S1-1', 'S1-2'],
    },
  ];

function areEndpointPointIdsEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((pointId, index) => pointId === right[index])
  );
}

export function isValidMeasurementDeriveEndpointOrder(
  upperVertebra: string,
  lowerVertebra: string
): boolean {
  const upperOrder = getMeasurementDeriveVertebraOrder(upperVertebra);
  const lowerOrder = getMeasurementDeriveVertebraOrder(lowerVertebra);
  return upperOrder !== null && lowerOrder !== null && upperOrder < lowerOrder;
}

export function getCompleteMeasurementDeriveEndpointGroups(
  keypoints: KeypointAnnotation[],
  examType: string
): string[] {
  const groups = isLateralExamType(examType)
    ? getLateralKeypointGroups()
    : isAnteriorExamType(examType)
      ? getApKeypointGroups()
      : [];
  const keypointIds = new Set(keypoints.map(keypoint => keypoint.id));

  return groups
    .filter(group => getMeasurementDeriveVertebraOrder(group.name) !== null)
    .filter(group =>
      group.keypoints.every(keypoint => keypointIds.has(keypoint.id))
    )
    .map(group => group.name)
    .sort(
      (left, right) =>
        getMeasurementDeriveVertebraOrder(left)! -
        getMeasurementDeriveVertebraOrder(right)!
    );
}

export function getLateralCobbEndpointPointIds(
  upperVertebra: string,
  lowerVertebra: string
): [string, string, string, string] {
  const namedRule = getLateralNamedCobbMeasurementRuleByEndpoints(
    upperVertebra,
    lowerVertebra
  );
  if (namedRule) {
    return namedRule.endpointPointIds;
  }

  if (lowerVertebra === 'S1') {
    return [
      `${upperVertebra}-1`,
      `${upperVertebra}-2`,
      'S1-1',
      'S1-2',
    ];
  }

  return [
    `${upperVertebra}-1`,
    `${upperVertebra}-2`,
    `${lowerVertebra}-3`,
    `${lowerVertebra}-4`,
  ];
}

export function getLateralNamedCobbMeasurementRuleByEndpoints(
  upperVertebra: string,
  lowerVertebra: string
): LateralNamedCobbMeasurementRule | null {
  return (
    LATERAL_NAMED_COBB_MEASUREMENT_RULES.find(
      rule =>
        rule.upperVertebra === upperVertebra &&
        rule.lowerVertebra === lowerVertebra
    ) ?? null
  );
}

export function getLateralNamedCobbMeasurementRuleByEndpointPointIds(
  endpointPointIds: readonly string[]
): LateralNamedCobbMeasurementRule | null {
  return (
    LATERAL_NAMED_COBB_MEASUREMENT_RULES.find(rule =>
      areEndpointPointIdsEqual(rule.endpointPointIds, endpointPointIds)
    ) ?? null
  );
}
