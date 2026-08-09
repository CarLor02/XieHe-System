import {
  getApVertebraKeypointGroups,
  getLateralKeypointGroups,
  type KeypointAnnotation,
} from '../../keypoints/domain';
import {
  isApProjectionExamType,
  isLateralExamType,
} from '../../shared/domain/anatomy';
import {
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
  getMeasurementDeriveVertebraOrder,
} from '../../shared/domain/anatomy';

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
    : isApProjectionExamType(examType)
      ? getApVertebraKeypointGroups()
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
