import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { AvtMetadata, AvtPointLayout } from './types';

function getReferenceKeypointIds(metadata: AvtMetadata): readonly string[] {
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
  return [...targetIds, ...getReferenceKeypointIds(metadata)];
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
    getReferenceKeypointIds(metadata)[pointIndex - targetPointCount] ?? null
  );
}

export function hasAvtReferenceKeypoints(
  metadata: AvtMetadata,
  keypointIds: ReadonlySet<string>
): boolean {
  return getReferenceKeypointIds(metadata).every(id => keypointIds.has(id));
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
  const referencePoints = getReferenceKeypointIds(metadata).map(id =>
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
