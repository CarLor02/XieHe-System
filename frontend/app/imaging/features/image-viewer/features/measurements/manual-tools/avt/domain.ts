import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  calculateActualDistance,
  type CalculationContext,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';
import {
  getMeasurementDeriveVertebraOrder,
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/vertebra-order';
import type {
  AvtMetadata,
  AvtPointLayout,
  AvtReferenceLine,
  AvtTarget,
} from './types';

const AVT_FIRST_VERTEBRA = 'T2';
const AVT_C7PL_LAST_VERTEBRA = 'T11';
const AVT_LAST_VERTEBRA = 'L4';

function getRequiredOrder(label: string): number {
  const order = getMeasurementDeriveVertebraOrder(label);
  if (order === null) {
    throw new Error(`Unknown AVT vertebra label: ${label}`);
  }
  return order;
}

const AVT_FIRST_ORDER = getRequiredOrder(AVT_FIRST_VERTEBRA);
const AVT_C7PL_LAST_ORDER = getRequiredOrder(AVT_C7PL_LAST_VERTEBRA);
const AVT_LAST_ORDER = getRequiredOrder(AVT_LAST_VERTEBRA);

export const AVT_VERTEBRA_TARGETS = MEASUREMENT_DERIVE_VERTEBRA_ORDER.filter(
  label => {
    const order = getRequiredOrder(label);
    return order >= AVT_FIRST_ORDER && order <= AVT_LAST_ORDER;
  }
);

export const AVT_DISC_TARGETS: Extract<AvtTarget, { type: 'disc' }>[] =
  AVT_VERTEBRA_TARGETS.slice(0, -1).map((upperVertebra, index) => ({
    type: 'disc',
    upperVertebra,
    lowerVertebra: AVT_VERTEBRA_TARGETS[index + 1],
  }));

export interface ResolvedAvtDefinition {
  metadata: AvtMetadata | null;
  layout: AvtPointLayout;
  targetLabel: string | null;
  isLegacy: boolean;
}

export interface AvtGeometry {
  targetPoints: Point[];
  targetCenter: Point;
  referencePoints: Point[];
  referenceCenter: Point;
  referenceLine: AvtReferenceLine;
  layout: AvtPointLayout;
}

function midpoint(left: Point, right: Point): Point {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function isAvtTarget(value: unknown): value is AvtTarget {
  if (!value || typeof value !== 'object') return false;
  const target = value as Partial<AvtTarget>;
  if (target.type === 'vertebra') {
    return (
      typeof target.vertebra === 'string' &&
      AVT_VERTEBRA_TARGETS.includes(
        target.vertebra as (typeof AVT_VERTEBRA_TARGETS)[number]
      )
    );
  }
  if (target.type === 'disc') {
    return (
      typeof target.upperVertebra === 'string' &&
      typeof target.lowerVertebra === 'string' &&
      AVT_DISC_TARGETS.some(
        candidate =>
          candidate.upperVertebra === target.upperVertebra &&
          candidate.lowerVertebra === target.lowerVertebra
      )
    );
  }
  return false;
}

export function isAvtMetadata(value: unknown): value is AvtMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<AvtMetadata>;
  return (
    metadata.schemaVersion === 2 &&
    (metadata.referenceLine === 'c7pl' || metadata.referenceLine === 'csvl') &&
    isAvtTarget(metadata.target)
  );
}

export function getAvtTargetLabel(target: AvtTarget): string {
  return target.type === 'vertebra'
    ? target.vertebra
    : `${target.upperVertebra}-${target.lowerVertebra}`;
}

export function getAvtTargetKey(target: AvtTarget): string {
  return target.type === 'vertebra'
    ? `vertebra:${target.vertebra}`
    : `disc:${target.upperVertebra}:${target.lowerVertebra}`;
}

export function getAvtMeasurementId(target: AvtTarget): string {
  const normalizedLabel = getAvtTargetLabel(target).toLowerCase();
  return target.type === 'vertebra'
    ? `ap-keypoint-avt-${normalizedLabel}`
    : `ap-keypoint-avt-disc-${normalizedLabel}`;
}

export function getAvtReferenceLine(target: AvtTarget): AvtReferenceLine {
  const comparisonLabel =
    target.type === 'vertebra' ? target.vertebra : target.upperVertebra;
  return getRequiredOrder(comparisonLabel) <= AVT_C7PL_LAST_ORDER
    ? 'c7pl'
    : 'csvl';
}

export function createAvtMetadata(target: AvtTarget): AvtMetadata {
  return {
    schemaVersion: 2,
    target,
    referenceLine: getAvtReferenceLine(target),
  };
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
  const referenceIds =
    metadata.referenceLine === 'c7pl'
      ? ['C7-1', 'C7-2', 'C7-3', 'C7-4']
      : ['SR', 'SL'];
  return [...targetIds, ...referenceIds];
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

  const referenceIds =
    metadata.referenceLine === 'c7pl'
      ? ['C7-1', 'C7-2', 'C7-3', 'C7-4']
      : ['SR', 'SL'];
  return referenceIds[pointIndex - targetPointCount] ?? null;
}

export function hasAvtReferenceKeypoints(
  metadata: AvtMetadata,
  keypointIds: ReadonlySet<string>
): boolean {
  const referenceIds =
    metadata.referenceLine === 'c7pl'
      ? ['C7-1', 'C7-2', 'C7-3', 'C7-4']
      : ['SR', 'SL'];
  return referenceIds.every(id => keypointIds.has(id));
}

export function createHorizontalDiscAnchors(
  firstClick: Point,
  secondClick: Point
): [Point, Point] {
  const horizontalSecond = { x: secondClick.x, y: firstClick.y };
  return firstClick.x <= horizontalSecond.x
    ? [{ ...firstClick }, horizontalSecond]
    : [horizontalSecond, { ...firstClick }];
}

export function updateHorizontalDiscAnchors(
  anchors: readonly [Point, Point],
  movedIndex: number,
  nextPoint: Point
): [Point, Point] {
  const next: [Point, Point] = [{ ...anchors[0] }, { ...anchors[1] }];
  next[movedIndex] = { ...nextPoint };
  next[1 - movedIndex] = {
    ...next[1 - movedIndex],
    y: nextPoint.y,
  };
  return next[0].x <= next[1].x ? next : [next[1], next[0]];
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
  const referenceIds =
    metadata.referenceLine === 'c7pl'
      ? ['C7-1', 'C7-2', 'C7-3', 'C7-4']
      : ['SR', 'SL'];
  const referencePoints = referenceIds.map(id => keypointsById.get(id));

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

export function resolveAvtDefinition(
  measurement: Pick<MeasurementData, 'points' | 'apexVertebra' | 'avtMetadata'>
): ResolvedAvtDefinition | null {
  if (isAvtMetadata(measurement.avtMetadata)) {
    return {
      metadata: measurement.avtMetadata,
      layout: getAvtPointLayout(measurement.avtMetadata),
      targetLabel: getAvtTargetLabel(measurement.avtMetadata.target),
      isLegacy: false,
    };
  }

  if (measurement.points.length === 2) {
    // 历史兼容：旧 AVT 保存 [apexCenter, csvlRef]，不能误判为椎间盘 a/b。
    return {
      metadata: null,
      layout: 'legacy-two-point',
      targetLabel: measurement.apexVertebra ?? null,
      isLegacy: true,
    };
  }

  if (measurement.points.length >= 6) {
    // 历史兼容：无 metadata 的六点 AVT 始终保持“椎体中心 + CSVL”语义。
    return {
      metadata: null,
      layout: 'legacy-six-point',
      targetLabel: measurement.apexVertebra ?? null,
      isLegacy: true,
    };
  }

  return null;
}

export function getAvtGeometry(
  measurement: Pick<MeasurementData, 'points' | 'apexVertebra' | 'avtMetadata'>
): AvtGeometry | null {
  const definition = resolveAvtDefinition(measurement);
  if (!definition) return null;

  const { points } = measurement;
  if (definition.layout === 'legacy-two-point') {
    if (points.length < 2) return null;
    return {
      targetPoints: [points[0]],
      targetCenter: points[0],
      referencePoints: [points[1]],
      referenceCenter: points[1],
      referenceLine: 'csvl',
      layout: definition.layout,
    };
  }

  if (definition.layout === 'legacy-six-point') {
    if (points.length < 6) return null;
    return {
      targetPoints: points.slice(0, 4),
      targetCenter: centroid(points.slice(0, 4)),
      referencePoints: points.slice(4, 6),
      referenceCenter: midpoint(points[4], points[5]),
      referenceLine: 'csvl',
      layout: definition.layout,
    };
  }

  const metadata = definition.metadata!;
  const targetPointCount = getAvtTargetPointCount(metadata);
  const referencePointCount = getAvtReferencePointCount(metadata);
  if (points.length < targetPointCount + referencePointCount) return null;

  const targetPoints = points.slice(0, targetPointCount);
  const referencePoints = points.slice(
    targetPointCount,
    targetPointCount + referencePointCount
  );
  return {
    targetPoints,
    targetCenter:
      metadata.target.type === 'vertebra'
        ? centroid(targetPoints)
        : midpoint(targetPoints[0], targetPoints[1]),
    referencePoints,
    referenceCenter:
      metadata.referenceLine === 'c7pl'
        ? centroid(referencePoints)
        : midpoint(referencePoints[0], referencePoints[1]),
    referenceLine: metadata.referenceLine,
    layout: definition.layout,
  };
}

export function calculateAvtValue(
  measurement: Pick<MeasurementData, 'points' | 'apexVertebra' | 'avtMetadata'>,
  context: CalculationContext
): string | null {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return null;

  const pixelOffset = geometry.targetCenter.x - geometry.referenceCenter.x;
  const actualDistance = calculateActualDistance(
    Math.abs(pixelOffset),
    context
  );
  const signedDistance = pixelOffset < 0 ? -actualDistance : actualDistance;
  return `${signedDistance.toFixed(2)}mm`;
}

export function getAvtLabelPosition(
  measurement: Pick<MeasurementData, 'points' | 'apexVertebra' | 'avtMetadata'>
): Point {
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return measurement.points[0] ?? { x: 0, y: 0 };
  if (geometry.layout === 'legacy-two-point') return geometry.targetCenter;

  return {
    x: Math.max(...geometry.targetPoints.map(point => point.x)),
    y: geometry.targetCenter.y,
  };
}

export function isSameAvtTarget(
  measurement: Pick<MeasurementData, 'points' | 'apexVertebra' | 'avtMetadata'>,
  target: AvtTarget
): boolean {
  const definition = resolveAvtDefinition(measurement);
  if (!definition) return false;
  if (definition.metadata) {
    return (
      getAvtTargetKey(definition.metadata.target) === getAvtTargetKey(target)
    );
  }
  return (
    target.type === 'vertebra' &&
    definition.targetLabel?.trim().toUpperCase() ===
      target.vertebra.trim().toUpperCase()
  );
}
