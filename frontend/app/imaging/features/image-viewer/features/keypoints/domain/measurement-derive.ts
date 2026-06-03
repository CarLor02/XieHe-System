import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import { getLateralKeypointGroups } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  isAnteriorExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

// 编号越小代表生理学位置越靠上。
export const MEASUREMENT_DERIVE_VERTEBRA_ORDER = [
  'C2',
  'C7',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'T10',
  'T11',
  'T12',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'S1',
] as const;

const measurementDeriveVertebraOrderByLabel: Map<string, number> = new Map(
  MEASUREMENT_DERIVE_VERTEBRA_ORDER.map((label, index) => [label, index + 1])
);

export function getMeasurementDeriveVertebraOrder(
  vertebra: string
): number | null {
  return measurementDeriveVertebraOrderByLabel.get(vertebra) ?? null;
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
  if (upperVertebra === 'C2' && lowerVertebra === 'C7') {
    return ['C2-3', 'C2-4', 'C7-3', 'C7-4'];
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
