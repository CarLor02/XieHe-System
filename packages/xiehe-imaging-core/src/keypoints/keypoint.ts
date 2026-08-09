import type {
  AnnotationSource,
  Point,
} from '../contracts';

/** 关键点来源与持久化标注来源保持同一枚举。 */
export type KeypointSource = AnnotationSource;

/** 关键点领域实体；坐标始终使用图像坐标。 */
export interface KeypointAnnotation {
  id: string;
  point: Point;
  source: KeypointSource;
  confidence: number;
}

const REGION_ORDER: Record<string, number> = {
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

  return {
    region: REGION_ORDER[regionLetter] ?? Number.MAX_SAFE_INTEGER,
    segment: match?.[2] ? Number(match[2]) : Number.MAX_SAFE_INTEGER,
    point: match?.[3] ? Number(match[3]) : Number.MAX_SAFE_INTEGER,
    fallback: keypointId,
  };
}

/** 按颈椎、胸椎、腰椎、骶椎及点号的解剖顺序比较关键点。 */
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

/** 返回新数组，不修改调用方持有的关键点集合。 */
export function sortKeypoints(
  keypoints: KeypointAnnotation[]
): KeypointAnnotation[] {
  return [...keypoints].sort((left, right) =>
    compareAnatomicalKeypointIds(left.id, right.id)
  );
}
