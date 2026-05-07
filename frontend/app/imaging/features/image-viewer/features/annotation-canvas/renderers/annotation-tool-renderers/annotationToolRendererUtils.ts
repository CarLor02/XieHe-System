import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export * from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/shared/rendererUtils';

export type PelvicMeasurementGeometry = {
  femoralHeadCenter: Point | null;
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
};

export const RENDER_SCREEN_LENGTHS = {
  t1TiltArcRadius: 30,
  t1TiltReferenceHalfWidth: 100,
  tpaArcRadius: 40,
  pelvicNormalLength: 80,
  pelvicVerticalHalfLength: 80,
  pelvicReferenceHalfWidth: 100,
  ssArcRadius: 24,
  ssReverseGuideLength: 80,
  verticalGuideLength: 150,
  sacralPerpendicularLength: 300,
  horizontalGuideWidth: 150,
  fallbackGuideLength: 80,
  arrowHeadLength: 6,
  arrowHeadHalfHeight: 4,
} as const;

export function getPelvicMeasurementGeometry(
  screenPoints: Point[]
): PelvicMeasurementGeometry | null {
  if (screenPoints.length < 2) return null;

  const femoralHeadCenter = screenPoints.length >= 3 ? screenPoints[0] : null;
  const sacralLeft =
    screenPoints.length >= 3 ? screenPoints[1] : screenPoints[0];
  const sacralRight =
    screenPoints.length >= 3 ? screenPoints[2] : screenPoints[1];
  const endplateDx = sacralRight.x - sacralLeft.x;
  const endplateDy = sacralRight.y - sacralLeft.y;
  const endplateLength = Math.sqrt(
    endplateDx * endplateDx + endplateDy * endplateDy
  );

  if (endplateLength === 0) return null;

  return {
    femoralHeadCenter,
    sacralLeft,
    sacralRight,
    sacralMidpoint: {
      x: (sacralLeft.x + sacralRight.x) / 2,
      y: (sacralLeft.y + sacralRight.y) / 2,
    },
    sacralNormal: {
      x: -endplateDy / endplateLength,
      y: endplateDx / endplateLength,
    },
  };
}

export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

export function getShortestAngleDiff(
  fromAngle: number,
  toAngle: number
): number {
  let diff = normalizeAngle(toAngle) - normalizeAngle(fromAngle);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function pickClosestRayAngle(
  baseAngle: number,
  candidateAngles: number[]
): number {
  return candidateAngles.reduce((best, current) =>
    Math.abs(getShortestAngleDiff(baseAngle, current)) <
    Math.abs(getShortestAngleDiff(baseAngle, best))
      ? current
      : best
  );
}

export function buildAngleArc(
  vertex: Point,
  firstRayAngle: number,
  secondRayAngle: number,
  radius: number
): string {
  const startX = vertex.x + radius * Math.cos((firstRayAngle * Math.PI) / 180);
  const startY = vertex.y + radius * Math.sin((firstRayAngle * Math.PI) / 180);
  const endX = vertex.x + radius * Math.cos((secondRayAngle * Math.PI) / 180);
  const endY = vertex.y + radius * Math.sin((secondRayAngle * Math.PI) / 180);
  const angleDiff = getShortestAngleDiff(firstRayAngle, secondRayAngle);
  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`;
}

export function getPelvicArcRadius(
  referenceLength: number,
  guideLength: number,
  layer: 'inner' | 'outer'
): number {
  const maxArcRadius = 36;
  const baseRadius = Math.max(
    12,
    Math.min(maxArcRadius, referenceLength * 0.35, guideLength * 0.45)
  );

  if (layer === 'inner') {
    return Math.max(9, baseRadius - 10);
  }

  return baseRadius;
}
