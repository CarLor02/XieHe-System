import {
  BasicMode,
  DEFAULT_BASIC_MODES,
  type AnnotationEditorSnapshot,
} from '@xiehe/imaging-core/editor';
import { getKeypointGroupsForExamType } from '@xiehe/imaging-core/keypoints';
import {
  getMeasurementDeriveVertebraOrder,
  isKeypointSupportedExamType,
} from '@xiehe/imaging-core/anatomy';

export function getEditorBasicModes(examType: string): readonly BasicMode[] {
  return isKeypointSupportedExamType(examType)
    ? DEFAULT_BASIC_MODES
    : [BasicMode.Move];
}

export function getRectificationGroups(
  snapshot: AnnotationEditorSnapshot,
  examType: string
) {
  const ids = new Set(snapshot.keypoints.map(point => point.id));
  return getKeypointGroupsForExamType(examType)
    .filter(group => group.keypoints.length === 4)
    .map(group => ({
      ...group,
      complete: group.keypoints.every(point => ids.has(point.id)),
      existingCount: group.keypoints.filter(point => ids.has(point.id)).length,
    }));
}

export function getVertebraOptions(examType: string): string[] {
  return getKeypointGroupsForExamType(examType)
    .map(group => group.name)
    .filter(name => getMeasurementDeriveVertebraOrder(name) !== null)
    .sort(
      (a, b) =>
        getMeasurementDeriveVertebraOrder(a)! -
        getMeasurementDeriveVertebraOrder(b)!
    );
}
