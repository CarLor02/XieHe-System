import {
  AP_POSE_KEYPOINTS,
  AP_VERTEBRA_GROUPS,
  parseApVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/ap';
import {
  LATERAL_ANATOMICAL_KEYPOINTS,
  LATERAL_SACRAL_KEYPOINTS,
  LATERAL_VERTEBRA_GROUPS,
  parseLateralSacralKeypointId,
  parseLateralVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/catalog/lateral';
import {
  isAnteriorExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/exam-type';
import {
  type KeypointAnnotation,
  type KeypointSource,
  sortKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint';
import {
  isApVertebraGroup,
  isLateralVertebraGroup,
  isSinglePointKeypointLabel,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-label';
import {
  AnnotationSource,
  type CfhAnnotation,
  type Point,
  type VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

interface CornerRef {
  label: string;
  index: number;
}

const AP_POSE_KEYPOINT_SET = new Set<string>(AP_POSE_KEYPOINTS);
const LATERAL_ANATOMICAL_KEYPOINT_SET = new Set<string>(
  LATERAL_ANATOMICAL_KEYPOINTS
);

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

function vertebraeLayerToAnteriorKeypoints(
  vertebraeLayer: VertebraAnnotation[]
): KeypointAnnotation[] {
  const byId = new Map<string, KeypointAnnotation>();

  vertebraeLayer.forEach(annotation => {
    const { source, confidence } = annotation;
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

    if (isApVertebraGroup(annotation.label)) {
      annotation.corners.forEach((point, index) => {
        const id = `${annotation.label}-${index + 1}`;
        byId.set(id, { id, point, source, confidence });
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
    const { source, confidence } = annotation;
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

    if (isLateralVertebraGroup(annotation.label)) {
      annotation.corners.forEach((point, index) => {
        const id = `${annotation.label}-${index + 1}`;
        byId.set(id, { id, point, source, confidence });
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

/** 将持久化/检测图层统一转换为关键点实体。 */
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

/** 生成画布图层；完整椎体合并为四角结构，其余关键点保持单点结构。 */
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

/** 持久化时每个关键点独立存储，兼容现有 annotation.vertebraeLayer。 */
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
