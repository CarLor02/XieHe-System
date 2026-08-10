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

export type MeasurementDeriveEndpointRole = 'upper' | 'lower';

export function isValidMeasurementDeriveEndpointOrder(
  upperVertebra: string,
  lowerVertebra: string
): boolean {
  const upperOrder = getMeasurementDeriveVertebraOrder(upperVertebra);
  const lowerOrder = getMeasurementDeriveVertebraOrder(lowerVertebra);
  return upperOrder !== null && lowerOrder !== null && upperOrder < lowerOrder;
}

function getRequiredEndpointKeypointIds(
  vertebra: string,
  examType: string,
  role: MeasurementDeriveEndpointRole
): readonly string[] {
  if (role === 'upper') return [`${vertebra}-1`, `${vertebra}-2`];
  if (isLateralExamType(examType) && vertebra === 'S1') {
    return ['S1-1', 'S1-2'];
  }
  return [`${vertebra}-3`, `${vertebra}-4`];
}

/**
 * 派生端椎只要求当前 Cobb 角色实际使用的端板两点，不要求整个椎体四角完整。
 * 命名侧位 Cobb 组合在应用派生前被排除，因此这里按通用 Cobb/S1 规则判断。
 */
export function getMeasurementDeriveEndpointGroups(
  keypoints: KeypointAnnotation[],
  examType: string,
  role: MeasurementDeriveEndpointRole
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
      getRequiredEndpointKeypointIds(group.name, examType, role).every(id =>
        keypointIds.has(id)
      )
    )
    .map(group => group.name)
    .sort(
      (left, right) =>
        getMeasurementDeriveVertebraOrder(left)! -
        getMeasurementDeriveVertebraOrder(right)!
    );
}
