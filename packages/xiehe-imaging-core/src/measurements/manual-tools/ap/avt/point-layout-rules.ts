import type { Point } from '../../../../contracts';
import type {
  AvtMetadata,
  AvtPointLayout,
} from '../../../../contracts';

export function getAvtReferenceKeypointIds(
  metadata: AvtMetadata
): readonly string[] {
  // 历史兼容：CSVL 在 AVT measurement.points 中固定保存为 SR、SL。
  // 手动补点使用 placement-rules 中独立的 SL、SR 交互顺序，不能改动这里。
  return metadata.referenceLine === 'c7pl'
    ? ['C7-1', 'C7-2', 'C7-3', 'C7-4']
    : ['SR', 'SL'];
}

export function getAvtPointLayout(metadata: AvtMetadata): AvtPointLayout {
  return `${metadata.target.type}-${metadata.referenceLine}` as AvtPointLayout;
}

export function getAvtTargetPointCount(metadata: AvtMetadata): number {
  return metadata.target.type === 'vertebra' ? 4 : 2;
}

export function getAvtReferencePointCount(metadata: AvtMetadata): number {
  return metadata.referenceLine === 'c7pl' ? 4 : 2;
}

export function getAvtRequiredKeypointIds(
  metadata: AvtMetadata
): readonly string[] {
  const target = metadata.target;
  const targetIds =
    target.type === 'vertebra'
      ? [1, 2, 3, 4].map(index => `${target.vertebra}-${index}`)
      : [];
  return [...targetIds, ...getAvtReferenceKeypointIds(metadata)];
}

export function getAvtPointKeypointId(
  metadata: AvtMetadata,
  pointIndex: number
): string | null {
  const targetPointCount = getAvtTargetPointCount(metadata);
  if (pointIndex < targetPointCount) {
    return metadata.target.type === 'vertebra'
      ? `${metadata.target.vertebra}-${pointIndex + 1}`
      : null;
  }

  return (
    getAvtReferenceKeypointIds(metadata)[pointIndex - targetPointCount] ?? null
  );
}

export function hasAvtReferenceKeypoints(
  metadata: AvtMetadata,
  keypointIds: ReadonlySet<string>
): boolean {
  return getAvtReferenceKeypointIds(metadata).every(id => keypointIds.has(id));
}

export function buildAvtPoints(
  metadata: AvtMetadata,
  keypointsById: ReadonlyMap<string, Point>,
  discAnchors?: readonly [Point, Point]
): Point[] | null {
  const target = metadata.target;
  const targetPoints =
    target.type === 'vertebra'
      ? [1, 2, 3, 4].map(index =>
          keypointsById.get(`${target.vertebra}-${index}`)
        )
      : discAnchors
        ? [...discAnchors]
        : [];
  const referencePoints = getAvtReferenceKeypointIds(metadata).map(id =>
    keypointsById.get(id)
  );

  if (
    targetPoints.length !== getAvtTargetPointCount(metadata) ||
    !targetPoints.every((point): point is Point => point !== undefined) ||
    !referencePoints.every((point): point is Point => point !== undefined)
  ) {
    return null;
  }

  return [
    ...targetPoints.map(point => ({ ...point })),
    ...referencePoints.map(point => ({ ...point })),
  ];
}
