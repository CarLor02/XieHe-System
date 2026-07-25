import { getApKeypointGroups } from '@/app/imaging/features/image-viewer/features/keypoints/catalog/ap';
import { getLateralKeypointGroups } from '@/app/imaging/features/image-viewer/features/keypoints/catalog/lateral';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  isAnteriorExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
  getMeasurementDeriveVertebraOrder,
} from '@/app/imaging/features/image-viewer/shared/domain/spine/vertebra-order';

export { MEASUREMENT_DERIVE_VERTEBRA_ORDER, getMeasurementDeriveVertebraOrder };

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
