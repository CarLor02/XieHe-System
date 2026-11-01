import {
  getKeypointGroupsForExamType,
  type KeypointAnnotation,
} from '@xiehe/imaging-core/keypoints';
import type { KeypointSequenceSession } from '@xiehe/imaging-core/editor';
import {
  BILATERAL_FH_KEYPOINT_IDS,
  SINGLE_FH_KEYPOINT_IDS,
} from '@xiehe/imaging-core/measurements/lateral';

export function getKeypointToolGroups(
  examType: string,
  keypoints: KeypointAnnotation[]
) {
  const ids = new Set(keypoints.map(point => point.id));
  return getKeypointGroupsForExamType(examType).map(group => {
    const missing = group.keypoints.filter(point => !ids.has(point.id));
    const conflict =
      (group.id === 'CFH' &&
        BILATERAL_FH_KEYPOINT_IDS.some(id => ids.has(id))) ||
      (group.id === 'FH' && SINGLE_FH_KEYPOINT_IDS.some(id => ids.has(id)));
    return {
      ...group,
      missing,
      existingCount: group.keypoints.length - missing.length,
      canSequence: group.keypoints.length > 1 && group.id !== 'pose',
      blockedReason: conflict
        ? '已存在另一种股骨头模式'
        : missing.length === 0
          ? '已完整'
          : '',
    };
  });
}

/** 菜单与绘图入口使用同一份可用性判断，避免绕过禁用状态重复写入点位。 */
export function createKeypointDrawingSequence(
  toolId: string,
  examType: string,
  keypoints: KeypointAnnotation[]
): KeypointSequenceSession | null {
  const groupTool = toolId.startsWith('keypoint-group:');
  if (!groupTool && !toolId.startsWith('keypoint:')) return null;
  const id = toolId.slice(toolId.indexOf(':') + 1);
  const group = getKeypointToolGroups(examType, keypoints).find(item =>
    groupTool ? item.id === id : item.keypoints.some(point => point.id === id)
  );
  if (!group) throw new Error('此检查类型不支持该关键点');
  if (group.blockedReason) throw new Error(group.blockedReason);
  if (groupTool && !group.canSequence) throw new Error('请选择具体关键点');
  if (!groupTool && !group.missing.some(point => point.id === id))
    throw new Error(`${id} 已存在，不能重复添加`);
  return {
    groupName: group.name,
    keypointIds: groupTool ? group.missing.map(point => point.id) : [id],
    currentIndex: 0,
  };
}
