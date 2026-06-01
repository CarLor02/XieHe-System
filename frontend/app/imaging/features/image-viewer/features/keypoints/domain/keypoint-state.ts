import {
  AP_POSE_KEYPOINTS,
  AP_VERTEBRA_GROUPS,
  getApKeypointGroups,
  parseApVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import {
  LATERAL_ANATOMICAL_KEYPOINTS,
  LATERAL_CENTER_VERTEBRA_GROUPS,
  LATERAL_SACRAL_KEYPOINTS,
  LATERAL_VERTEBRA_GROUPS,
  getLateralKeypointGroups,
  parseLateralSacralKeypointId,
  parseLateralVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import {
  AnnotationSource,
  CfhAnnotation,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

export type KeypointSource = AnnotationSource;

export interface KeypointAnnotation {
  id: string;
  point: Point;
  source: KeypointSource;
  confidence: number;
}

export type VertebraCornerSequenceNumber = 1 | 2 | 3 | 4;

export interface VertebraCornerOrderMapping {
  from: VertebraCornerSequenceNumber;
  to: VertebraCornerSequenceNumber;
}

export type RectifyVertebraCornerOrderResult =
  | { ok: true; keypoints: KeypointAnnotation[] }
  | {
      ok: false;
      missingSequenceNumbers: VertebraCornerSequenceNumber[];
    };

interface KeypointGroupLike {
  id: string;
  name: string;
  keypoints: { id: string; name: string; group: string }[];
}

interface CornerRef {
  label: string;
  index: number;
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
const VERTEBRA_CORNER_SEQUENCE_NUMBERS = [1, 2, 3, 4] as const;

export function isAnteriorExamType(examType: string): boolean {
  return examType === '正位X光片';
}

export function isLateralExamType(examType: string): boolean {
  return examType === '侧位X光片';
}

export function isKeypointSupportedExamType(examType: string): boolean {
  return isAnteriorExamType(examType) || isLateralExamType(examType);
}

export function getKeypointGroupsForExamType(
  examType: string
): KeypointGroupLike[] {
  if (isAnteriorExamType(examType)) return getApKeypointGroups();
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

function isFullApVertebraLabel(label: string): boolean {
  return AP_VERTEBRA_GROUP_SET.has(label);
}

function isFullLateralVertebraLabel(label: string): boolean {
  return LATERAL_VERTEBRA_GROUP_SET.has(label);
}

function pointLayer(
  label: string,
  point: Point,
  source: KeypointSource,
  confidence = 1
): VertebraAnnotation {
  return {
    label,
    corners: [point, point, point, point],
    confidence,
    source,
  };
}

function groupSource(keypoints: KeypointAnnotation[]): KeypointSource {
  return keypoints.every(keypoint => keypoint.source === AnnotationSource.AI)
    ? AnnotationSource.AI
    : AnnotationSource.MANUAL;
}

function groupConfidence(keypoints: KeypointAnnotation[]): number {
  return Math.min(...keypoints.map(keypoint => keypoint.confidence));
}

const regionOrder: Record<string, number> = {
  C: 1,
  T: 2,
  L: 3,
  S: 4,
};

interface AnatomicalKeypointSortKey {
  region: number;
  segment: number;
  point: number;
  fallback: string;
}

function getAnatomicalKeypointSortKey(
  keypointId: string
): AnatomicalKeypointSortKey {
  const match = /^([CTLS])(\d+)?(?:-(\d+))?$/.exec(keypointId);
  const regionLetter = match?.[1] ?? keypointId[0];
  const region = regionOrder[regionLetter] ?? Number.MAX_SAFE_INTEGER;

  return {
    region,
    segment: match?.[2] ? Number(match[2]) : Number.MAX_SAFE_INTEGER,
    point: match?.[3] ? Number(match[3]) : Number.MAX_SAFE_INTEGER,
    fallback: keypointId,
  };
}

export function compareAnatomicalKeypointIds(
  left: string,
  right: string
): number {
  const leftKey = getAnatomicalKeypointSortKey(left);
  const rightKey = getAnatomicalKeypointSortKey(right);

  return (
    leftKey.region - rightKey.region ||
    leftKey.segment - rightKey.segment ||
    leftKey.point - rightKey.point ||
    leftKey.fallback.localeCompare(rightKey.fallback)
  );
}

function sortKeypoints(keypoints: KeypointAnnotation[]): KeypointAnnotation[] {
  return [...keypoints].sort((a, b) =>
    compareAnatomicalKeypointIds(a.id, b.id)
  );
}

export function upsertKeypoint(
  keypoints: KeypointAnnotation[],
  nextKeypoint: KeypointAnnotation
): KeypointAnnotation[] {
  const withoutDuplicate = keypoints.filter(
    item => item.id !== nextKeypoint.id
  );
  return sortKeypoints([...withoutDuplicate, nextKeypoint]);
}

export function deleteKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): KeypointAnnotation[] {
  return keypoints.filter(item => item.id !== keypointId);
}

function getMissingVertebraCornerSequenceNumbers(
  mapping: VertebraCornerOrderMapping[]
): VertebraCornerSequenceNumber[] {
  const targets = new Set(mapping.map(item => item.to));
  return VERTEBRA_CORNER_SEQUENCE_NUMBERS.filter(index => !targets.has(index));
}

export function rectifyVertebraCornerOrder(
  keypoints: KeypointAnnotation[],
  vertebra: string,
  mapping: VertebraCornerOrderMapping[]
): RectifyVertebraCornerOrderResult {
  const missingSequenceNumbers =
    getMissingVertebraCornerSequenceNumbers(mapping);
  const sources = new Set(mapping.map(item => item.from));
  const hasCompleteSources = VERTEBRA_CORNER_SEQUENCE_NUMBERS.every(index =>
    sources.has(index)
  );

  if (missingSequenceNumbers.length > 0 || !hasCompleteSources) {
    return {
      ok: false,
      missingSequenceNumbers,
    };
  }

  const targetBySource = new Map(
    mapping.map(item => [item.from, item.to] as const)
  );
  const vertebraPrefix = `${vertebra}-`;

  return {
    ok: true,
    keypoints: sortKeypoints(
      keypoints.map(keypoint => {
        if (!keypoint.id.startsWith(vertebraPrefix)) return keypoint;

        const sequenceNumber = Number(
          keypoint.id.slice(vertebraPrefix.length)
        ) as VertebraCornerSequenceNumber;
        if (!VERTEBRA_CORNER_SEQUENCE_NUMBERS.includes(sequenceNumber)) {
          return keypoint;
        }

        const nextSequenceNumber = targetBySource.get(sequenceNumber);
        if (!nextSequenceNumber) return keypoint;

        return {
          ...keypoint,
          id: `${vertebra}-${nextSequenceNumber}`,
          source:
            nextSequenceNumber === sequenceNumber
              ? keypoint.source
              : AnnotationSource.MANUAL,
        };
      })
    ),
  };
}

function isSamePoint(left: Point, right: Point): boolean {
  return left.x === right.x && left.y === right.y;
}

export function markMovedKeypointsManual(
  previousKeypoints: KeypointAnnotation[],
  nextKeypoints: KeypointAnnotation[]
): KeypointAnnotation[] {
  const previousById = new Map(
    previousKeypoints.map(keypoint => [keypoint.id, keypoint])
  );

  return sortKeypoints(
    nextKeypoints.map(nextKeypoint => {
      const previousKeypoint = previousById.get(nextKeypoint.id);
      if (
        !previousKeypoint ||
        isSamePoint(previousKeypoint.point, nextKeypoint.point)
      ) {
        return previousKeypoint
          ? {
              ...nextKeypoint,
              source: previousKeypoint.source,
              confidence: previousKeypoint.confidence,
            }
          : nextKeypoint;
      }

      return {
        ...nextKeypoint,
        source: AnnotationSource.MANUAL,
      };
    })
  );
}

export function hasKeypoint(
  keypoints: KeypointAnnotation[],
  keypointId: string
): boolean {
  return keypoints.some(item => item.id === keypointId);
}

function getCompleteGroups(
  keypoints: KeypointAnnotation[],
  groups: readonly string[]
): string[] {
  const byId = new Set(keypoints.map(keypoint => keypoint.id));
  return groups.filter(group =>
    [1, 2, 3, 4].every(index => byId.has(`${group}-${index}`))
  );
}

export function getCompleteApVertebraGroups(
  keypoints: KeypointAnnotation[]
): string[] {
  return getCompleteGroups(keypoints, AP_VERTEBRA_GROUPS);
}

export function getCompleteSelectableVertebraGroups(
  keypoints: KeypointAnnotation[],
  examType: string
): string[] {
  if (isLateralExamType(examType)) {
    return getCompleteGroups(keypoints, LATERAL_CENTER_VERTEBRA_GROUPS);
  }
  if (isAnteriorExamType(examType)) {
    return getCompleteApVertebraGroups(keypoints);
  }
  return [];
}

function vertebraeLayerToAnteriorKeypoints(
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

  return sortKeypoints(Array.from(byId.values()));
}

function vertebraeLayerToLateralKeypoints(
  vertebraeLayer: VertebraAnnotation[],
  cfhAnnotation: CfhAnnotation | null = null
): KeypointAnnotation[] {
  const byId = new Map<string, KeypointAnnotation>();

  vertebraeLayer.forEach(annotation => {
    const source = annotation.source;
    const confidence = annotation.confidence;
    const parsedVertebra = parseLateralVertebraKeypointId(annotation.label);
    const parsedSacral = parseLateralSacralKeypointId(annotation.label);

    if (
      parsedVertebra ||
      parsedSacral ||
      LATERAL_ANATOMICAL_KEYPOINT_SET.has(annotation.label)
    ) {
      byId.set(annotation.label, {
        id: annotation.label,
        point: annotation.corners[0],
        source,
        confidence,
      });
      return;
    }

    if (annotation.label === 'S1') {
      byId.set('S1-1', {
        id: 'S1-1',
        point: annotation.corners[0],
        source,
        confidence,
      });
      byId.set('S1-2', {
        id: 'S1-2',
        point: annotation.corners[1],
        source,
        confidence,
      });
      return;
    }

    if (isFullLateralVertebraLabel(annotation.label)) {
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

  if (cfhAnnotation) {
    byId.set('CFH', {
      id: 'CFH',
      point: cfhAnnotation.center,
      source: cfhAnnotation.source,
      confidence: cfhAnnotation.confidence,
    });
  }

  return sortKeypoints(Array.from(byId.values()));
}

export function vertebraeLayerToKeypoints(
  vertebraeLayer: VertebraAnnotation[],
  examType: string,
  cfhAnnotation: CfhAnnotation | null = null
): KeypointAnnotation[] {
  if (isLateralExamType(examType)) {
    return vertebraeLayerToLateralKeypoints(vertebraeLayer, cfhAnnotation);
  }
  if (isAnteriorExamType(examType)) {
    return vertebraeLayerToAnteriorKeypoints(vertebraeLayer);
  }
  return [];
}

export function vertebraeLayerToApKeypoints(
  vertebraeLayer: VertebraAnnotation[]
): KeypointAnnotation[] {
  return vertebraeLayerToAnteriorKeypoints(vertebraeLayer);
}

function completeVertebraLayers(
  groups: readonly string[],
  byId: Map<string, KeypointAnnotation>,
  consumed: Set<string>
): VertebraAnnotation[] {
  const layer: VertebraAnnotation[] = [];

  groups.forEach(group => {
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
        confidence: groupConfidence(groupKeypoints as KeypointAnnotation[]),
        source: groupSource(groupKeypoints as KeypointAnnotation[]),
      });
    }
  });

  return layer;
}

export function keypointsToRenderLayer(
  keypoints: KeypointAnnotation[],
  examType: string,
  hiddenKeypointIds: Set<string> = new Set()
): VertebraAnnotation[] {
  const visibleKeypoints = keypoints.filter(
    keypoint => !hiddenKeypointIds.has(keypoint.id)
  );
  const byId = new Map(
    visibleKeypoints.map(keypoint => [keypoint.id, keypoint])
  );
  const consumed = new Set<string>();
  const layer: VertebraAnnotation[] = [];

  if (isLateralExamType(examType)) {
    layer.push(
      ...completeVertebraLayers(LATERAL_VERTEBRA_GROUPS, byId, consumed)
    );

    const s1Keypoints = LATERAL_SACRAL_KEYPOINTS.map(id => byId.get(id));
    if (s1Keypoints.every(Boolean)) {
      s1Keypoints.forEach(keypoint => consumed.add(keypoint!.id));
      const [s1p1, s1p2] = s1Keypoints as [
        KeypointAnnotation,
        KeypointAnnotation,
      ];
      layer.push({
        label: 'S1',
        corners: [s1p1.point, s1p2.point, s1p1.point, s1p2.point],
        confidence: groupConfidence([s1p1, s1p2]),
        source: groupSource([s1p1, s1p2]),
      });
    }
  } else if (isAnteriorExamType(examType)) {
    layer.push(...completeVertebraLayers(AP_VERTEBRA_GROUPS, byId, consumed));
  }

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

export function keypointsToPersistedLayer(
  keypoints: KeypointAnnotation[]
): VertebraAnnotation[] {
  return sortKeypoints(keypoints).map(keypoint =>
    pointLayer(
      keypoint.id,
      keypoint.point,
      keypoint.source,
      keypoint.confidence
    )
  );
}

export function keypointsToDerivedLayer(
  keypoints: KeypointAnnotation[],
  examType: string
): VertebraAnnotation[] {
  if (isLateralExamType(examType)) {
    return keypointsToRenderLayer(keypoints, examType);
  }

  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const consumed = new Set<string>();
  const layer = completeVertebraLayers(AP_VERTEBRA_GROUPS, byId, consumed);

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

export function apKeypointsToRenderLayer(
  keypoints: KeypointAnnotation[],
  hiddenKeypointIds: Set<string> = new Set()
): VertebraAnnotation[] {
  return keypointsToRenderLayer(keypoints, '正位X光片', hiddenKeypointIds);
}

export function apKeypointsToPersistedLayer(
  keypoints: KeypointAnnotation[]
): VertebraAnnotation[] {
  return keypointsToPersistedLayer(keypoints);
}

export function apKeypointsToDerivedLayer(
  keypoints: KeypointAnnotation[]
): VertebraAnnotation[] {
  return keypointsToDerivedLayer(keypoints, '正位X光片');
}

export function keypointsToCfhAnnotation(
  keypoints: KeypointAnnotation[]
): CfhAnnotation | null {
  const cfh = keypoints.find(keypoint => keypoint.id === 'CFH');
  if (!cfh) return null;
  return {
    center: cfh.point,
    confidence: cfh.confidence,
    source: cfh.source,
  };
}

export function getSacralEndplatePoints(
  keypoints: KeypointAnnotation[]
): [Point, Point] | null {
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const s1p1 = byId.get('S1-1');
  const s1p2 = byId.get('S1-2');
  if (!s1p1 || !s1p2) return null;
  return [s1p1.point, s1p2.point];
}

export function renderCornerToKeypointId(
  label: string,
  cornerIndex: number
): string {
  if (label === 'S1') {
    return cornerIndex === 1 || cornerIndex === 3 ? 'S1-2' : 'S1-1';
  }
  if (isSinglePointKeypointLabel(label)) {
    return label;
  }
  return `${label}-${cornerIndex + 1}`;
}

export function keypointIdToRenderCornerRef(
  keypointId: string | null,
  visibleLayer: VertebraAnnotation[]
): CornerRef | null {
  if (!keypointId) return null;
  if (visibleLayer.some(item => item.label === keypointId)) {
    return { label: keypointId, index: 0 };
  }

  const parsedSacral = parseLateralSacralKeypointId(keypointId);
  if (parsedSacral && visibleLayer.some(item => item.label === 'S1')) {
    return { label: 'S1', index: parsedSacral.pointIndex };
  }

  const parsedVertebra =
    parseApVertebraKeypointId(keypointId) ??
    parseLateralVertebraKeypointId(keypointId);
  if (
    parsedVertebra &&
    visibleLayer.some(item => item.label === parsedVertebra.group)
  ) {
    return { label: parsedVertebra.group, index: parsedVertebra.pointIndex };
  }

  return null;
}

export function isLateralCenterVertebraGroup(group: string): boolean {
  return LATERAL_CENTER_VERTEBRA_GROUP_SET.has(group);
}
