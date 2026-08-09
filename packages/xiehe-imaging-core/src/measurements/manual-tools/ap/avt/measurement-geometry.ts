import type { MeasurementData, Point } from '../../../../contracts';
import {
  getAvtTargetKey,
  getAvtTargetLabel,
  isAvtMetadata,
} from './target-rules';
import {
  getAvtPointLayout,
  getAvtReferencePointCount,
  getAvtTargetPointCount,
} from './point-layout-rules';
import type {
  AvtMetadata,
  AvtPointLayout,
  AvtReferenceLine,
  AvtTarget,
} from '../../../../contracts';

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
