import {
  AP_POSE_KEYPOINTS,
  AP_VERTEBRA_GROUPS,
  ApKeypointSource,
  parseApVertebraKeypointId,
} from '../catalog/ap/keypoints';
import { Point, VertebraAnnotation } from '../types';

export interface KeypointAnnotation {
  id: string;
  point: Point;
  source: ApKeypointSource;
  confidence: number;
}

const AP_POSE_KEYPOINT_SET = new Set<string>(AP_POSE_KEYPOINTS);
const AP_VERTEBRA_GROUP_SET = new Set<string>(AP_VERTEBRA_GROUPS);

export function isAnteriorExamType(examType: string): boolean {
  return examType === '正位X光片';
}

export function isSinglePointKeypointLabel(label: string): boolean {
  return AP_POSE_KEYPOINT_SET.has(label) || parseApVertebraKeypointId(label) !== null;
}

export function isPoseKeypointLabel(label: string): boolean {
  return AP_POSE_KEYPOINT_SET.has(label);
}

export function isVertebraCornerKeypointLabel(label: string): boolean {
  return parseApVertebraKeypointId(label) !== null;
}

function isFullApVertebraLabel(label: string): boolean {
  return AP_VERTEBRA_GROUP_SET.has(label) || /^L5$/.test(label);
}

function pointLayer(
  label: string,
  point: Point,
  source: ApKeypointSource,
  confidence = 1
): VertebraAnnotation {
  return {
    label,
    corners: [point, point, point, point],
    confidence,
    source,
  };
}

export function upsertKeypoint(
  keypoints: KeypointAnnotation[],
  nextKeypoint: KeypointAnnotation
): KeypointAnnotation[] {
  const withoutDuplicate = keypoints.filter(item => item.id !== nextKeypoint.id);
  return [...withoutDuplicate, nextKeypoint];
}

export function deleteKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): KeypointAnnotation[] {
  return keypoints.filter(item => item.id !== keypointId);
}

export function hasKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): boolean {
  return keypoints.some(item => item.id === keypointId);
}

export function getCompleteApVertebraGroups(
  keypoints: KeypointAnnotation[]
): string[] {
  const byId = new Set(keypoints.map(keypoint => keypoint.id));
  return [...AP_VERTEBRA_GROUPS, 'L5'].filter(group =>
    [1, 2, 3, 4].every(index => byId.has(`${group}-${index}`))
  );
}

export function vertebraeLayerToApKeypoints(
  vertebraeLayer: VertebraAnnotation[]
): KeypointAnnotation[] {
  const byId = new Map<string, KeypointAnnotation>();

  vertebraeLayer.forEach(annotation => {
    const source = annotation.source;
    const confidence = annotation.confidence;
    const parsedSingle = parseApVertebraKeypointId(annotation.label);

    if (parsedSingle || AP_POSE_KEYPOINT_SET.has(annotation.label)) {
      byId.set(annotation.label, {
        id: annotation.label,
        point: annotation.corners[0],
        source,
        confidence,
      });
      return;
    }

    if (isFullApVertebraLabel(annotation.label)) {
      annotation.corners.forEach((point, index) => {
        const id = `${annotation.label}-${index + 1}`;
        byId.set(id, {
          id,
          point,
          source,
          confidence,
        });
      });
    }
  });

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function apKeypointsToRenderLayer(
  keypoints: KeypointAnnotation[],
  hiddenKeypointIds: Set<string> = new Set()
): VertebraAnnotation[] {
  const visibleKeypoints = keypoints.filter(
    keypoint => !hiddenKeypointIds.has(keypoint.id)
  );
  const byId = new Map(visibleKeypoints.map(keypoint => [keypoint.id, keypoint]));
  const consumed = new Set<string>();
  const layer: VertebraAnnotation[] = [];

  [...AP_VERTEBRA_GROUPS, 'L5'].forEach(group => {
    const groupKeypoints = [1, 2, 3, 4].map(index =>
      byId.get(`${group}-${index}`)
    );
    if (groupKeypoints.every(Boolean)) {
      groupKeypoints.forEach(keypoint => consumed.add(keypoint!.id));
      layer.push({
        label: group,
        corners: groupKeypoints.map(keypoint => keypoint!.point) as [
          Point,
          Point,
          Point,
          Point,
        ],
        confidence: Math.min(
          ...groupKeypoints.map(keypoint => keypoint!.confidence)
        ),
        source: groupKeypoints.every(keypoint => keypoint!.source === 'ai')
          ? 'ai'
          : 'manual',
      });
    }
  });

  visibleKeypoints.forEach(keypoint => {
    if (consumed.has(keypoint.id)) return;
    layer.push(
      pointLayer(
        keypoint.id,
        keypoint.point,
        keypoint.source,
        keypoint.confidence
      )
    );
  });

  return layer;
}

export function apKeypointsToPersistedLayer(
  keypoints: KeypointAnnotation[]
): VertebraAnnotation[] {
  return keypoints.map(keypoint =>
    pointLayer(keypoint.id, keypoint.point, keypoint.source, keypoint.confidence)
  );
}

export function apKeypointsToDerivedLayer(
  keypoints: KeypointAnnotation[]
): VertebraAnnotation[] {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const consumed = new Set<string>();
  const layer: VertebraAnnotation[] = [];

  [...AP_VERTEBRA_GROUPS, 'L5'].forEach(group => {
    const groupKeypoints = [1, 2, 3, 4].map(index =>
      byId.get(`${group}-${index}`)
    );
    if (groupKeypoints.every(Boolean)) {
      groupKeypoints.forEach(keypoint => consumed.add(keypoint!.id));
      layer.push({
        label: group,
        corners: groupKeypoints.map(keypoint => keypoint!.point) as [
          Point,
          Point,
          Point,
          Point,
        ],
        confidence: Math.min(
          ...groupKeypoints.map(keypoint => keypoint!.confidence)
        ),
        source: groupKeypoints.every(keypoint => keypoint!.source === 'ai')
          ? 'ai'
          : 'manual',
      });
    }
  });

  keypoints.forEach(keypoint => {
    if (consumed.has(keypoint.id)) return;
    if (AP_POSE_KEYPOINT_SET.has(keypoint.id)) {
      layer.push(
        pointLayer(
          keypoint.id,
          keypoint.point,
          keypoint.source,
          keypoint.confidence
        )
      );
    }
  });

  return layer;
}
