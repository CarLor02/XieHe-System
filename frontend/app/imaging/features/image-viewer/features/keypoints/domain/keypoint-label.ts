import {
  AP_POSE_KEYPOINTS,
  AP_VERTEBRA_GROUPS,
  getApKeypointGroups,
  getApVertebraKeypointGroups,
  parseApVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/ap';
import {
  LATERAL_ANATOMICAL_KEYPOINTS,
  LATERAL_CENTER_VERTEBRA_GROUPS,
  LATERAL_VERTEBRA_GROUPS,
  getLateralKeypointGroups,
  parseLateralSacralKeypointId,
  parseLateralVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/lateral';
import {
  isAnteriorExamType,
  isBendingExamType,
  isLateralExamType,
} from '@xiehe/imaging-core/anatomy';

export interface KeypointGroup {
  id: string;
  name: string;
  keypoints: { id: string; name: string; group: string }[];
}

const AP_POSE_KEYPOINT_SET = new Set<string>(AP_POSE_KEYPOINTS);
const AP_VERTEBRA_GROUP_SET = new Set<string>(AP_VERTEBRA_GROUPS);
const LATERAL_VERTEBRA_GROUP_SET = new Set<string>(LATERAL_VERTEBRA_GROUPS);
const LATERAL_CENTER_VERTEBRA_GROUP_SET = new Set<string>(
  LATERAL_CENTER_VERTEBRA_GROUPS
);
const LATERAL_ANATOMICAL_KEYPOINT_SET = new Set<string>(
  LATERAL_ANATOMICAL_KEYPOINTS
);

/** 根据检查类型返回当前关键点 catalog 中可用的分组。 */
export function getKeypointGroupsForExamType(
  examType: string
): KeypointGroup[] {
  if (isAnteriorExamType(examType)) return getApKeypointGroups();
  if (isBendingExamType(examType)) return getApVertebraKeypointGroups();
  if (isLateralExamType(examType)) return getLateralKeypointGroups();
  return [];
}

export function isSinglePointKeypointLabel(label: string): boolean {
  return (
    AP_POSE_KEYPOINT_SET.has(label) ||
    parseApVertebraKeypointId(label) !== null ||
    parseLateralVertebraKeypointId(label) !== null ||
    parseLateralSacralKeypointId(label) !== null ||
    LATERAL_ANATOMICAL_KEYPOINT_SET.has(label)
  );
}

export function isPoseKeypointLabel(label: string): boolean {
  return AP_POSE_KEYPOINT_SET.has(label);
}

export function isVertebraCornerKeypointLabel(label: string): boolean {
  return (
    parseApVertebraKeypointId(label) !== null ||
    parseLateralVertebraKeypointId(label) !== null
  );
}

export function isSacralEndplateKeypointLabel(label: string): boolean {
  return parseLateralSacralKeypointId(label) !== null;
}

export function isAnatomicalPointKeypointLabel(label: string): boolean {
  return LATERAL_ANATOMICAL_KEYPOINT_SET.has(label);
}

export function isApVertebraGroup(label: string): boolean {
  return AP_VERTEBRA_GROUP_SET.has(label);
}

export function isLateralVertebraGroup(label: string): boolean {
  return LATERAL_VERTEBRA_GROUP_SET.has(label);
}

export function isLateralCenterVertebraGroup(group: string): boolean {
  return LATERAL_CENTER_VERTEBRA_GROUP_SET.has(group);
}
