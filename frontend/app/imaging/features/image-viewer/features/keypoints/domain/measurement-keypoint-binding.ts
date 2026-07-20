import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  createHemipelvicWidthRatioPoints,
  getHemipelvicVerticalLines,
  HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT,
  HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  sortHemipelvicVerticalLines,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';
import {
  AnnotationSource,
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  KeypointAnnotation,
  upsertKeypoint,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

export const HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS = [
  'ASIS_L',
  'SI_L',
  'SI_R',
  'ASIS_R',
] as const;

interface MeasurementKeypointBindingRule {
  typeId: string;
  requiredKeypointIds: readonly string[];
  writebackOnComplete?: boolean;
  getKeypointUpdates: (
    points: Point[],
    changedPointIndex?: number
  ) => Array<{
    keypointId: string;
    point: Point;
  }>;
  buildMeasurementPoints: (
    byId: Map<string, KeypointAnnotation>,
    existingPoints?: Point[]
  ) => Point[] | null;
}

function getRequiredPoints(
  byId: Map<string, KeypointAnnotation>,
  keypointIds: readonly string[]
): Point[] | null {
  const points = keypointIds.map(keypointId => byId.get(keypointId)?.point);
  return points.every((point): point is Point => point !== undefined)
    ? points
    : null;
}

function moveHemipelvicLineToAnchor(
  points: Point[],
  sourceIndex: number,
  target: Point
): Point[] {
  const line = getHemipelvicVerticalLines(points).find(
    item => item.sourceIndex === sourceIndex
  );
  if (!line) return points;

  const nextPoints = points.map(point => ({ ...point }));
  const delta = {
    x: target.x - line.anchor.x,
    y: target.y - line.anchor.y,
  };
  nextPoints[line.anchorIndex] = { ...target };
  nextPoints[line.topPointIndex] = {
    x: line.top.x + delta.x,
    y: line.top.y + delta.y,
  };
  nextPoints[line.bottomPointIndex] = {
    x: line.bottom.x + delta.x,
    y: line.bottom.y + delta.y,
  };
  return nextPoints;
}

const CA_BINDING_RULE: MeasurementKeypointBindingRule = {
  typeId: 'ca',
  requiredKeypointIds: ['CR', 'CL'],
  getKeypointUpdates: (points, changedPointIndex) => {
    if (points.length < 2) return [];
    const updates = [
      { keypointId: 'CR', point: points[0] },
      { keypointId: 'CL', point: points[1] },
    ];
    return changedPointIndex === undefined
      ? updates
      : updates.filter((_, index) => index === changedPointIndex);
  },
  buildMeasurementPoints: byId => getRequiredPoints(byId, ['CR', 'CL']),
};

const TTS_BINDING_RULE: MeasurementKeypointBindingRule = {
  typeId: 'tts',
  requiredKeypointIds: ['SR', 'SL'],
  // 骶骨点由现有关键点继承；创建 TTS 本身不代表医生调整了 SR/SL。
  writebackOnComplete: false,
  getKeypointUpdates: (points, changedPointIndex) => {
    if (points.length < 4) return [];
    const updates = [
      { keypointId: 'SR', point: points[2] },
      { keypointId: 'SL', point: points[3] },
    ];
    if (changedPointIndex === undefined) return updates;
    if (changedPointIndex === 2) return [updates[0]];
    if (changedPointIndex === 3) return [updates[1]];
    return [];
  },
  buildMeasurementPoints: (byId, existingPoints) => {
    const sacralPoints = getRequiredPoints(byId, ['SR', 'SL']);
    if (!sacralPoints || !existingPoints || existingPoints.length < 4) {
      return null;
    }

    const points = existingPoints.map(point => ({ ...point }));
    points[2] = sacralPoints[0];
    points[3] = sacralPoints[1];
    return points;
  },
};

const HEMIPELVIC_WIDTH_RATIO_BINDING_RULE: MeasurementKeypointBindingRule = {
  typeId: HEMIPELVIC_WIDTH_RATIO_TOOL_ID,
  requiredKeypointIds: HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS,
  getKeypointUpdates: (points, changedPointIndex) => {
    if (
      changedPointIndex !== undefined &&
      changedPointIndex >= HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT
    ) {
      return [];
    }
    const sortedLines = sortHemipelvicVerticalLines(
      getHemipelvicVerticalLines(points)
    );
    if (sortedLines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT) return [];

    return sortedLines.map((line, index) => ({
      keypointId: HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS[index],
      point: line.anchor,
    }));
  },
  buildMeasurementPoints: (byId, existingPoints) => {
    const anchors = getRequiredPoints(
      byId,
      HEMIPELVIC_WIDTH_RATIO_KEYPOINT_IDS
    );
    if (!anchors) return null;

    const sortedExistingLines = existingPoints
      ? sortHemipelvicVerticalLines(getHemipelvicVerticalLines(existingPoints))
      : [];
    if (
      !existingPoints ||
      sortedExistingLines.length !== HEMIPELVIC_WIDTH_RATIO_ANCHOR_COUNT
    ) {
      return createHemipelvicWidthRatioPoints(anchors);
    }

    return sortedExistingLines.reduce(
      (points, line, index) =>
        moveHemipelvicLineToAnchor(points, line.sourceIndex, anchors[index]),
      existingPoints
    );
  },
};

const MEASUREMENT_KEYPOINT_BINDING_RULES = new Map<
  string,
  MeasurementKeypointBindingRule
>(
  [
    CA_BINDING_RULE,
    TTS_BINDING_RULE,
    HEMIPELVIC_WIDTH_RATIO_BINDING_RULE,
  ].map(rule => [rule.typeId, rule])
);

export function getMeasurementKeypointBindingRule(
  measurementType: string
): MeasurementKeypointBindingRule | null {
  return (
    MEASUREMENT_KEYPOINT_BINDING_RULES.get(
      getAnnotationTypeId(measurementType)
    ) ?? null
  );
}

export function shouldWriteMeasurementKeypointsOnComplete(
  measurementType: string
): boolean {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  return rule ? rule.writebackOnComplete !== false : false;
}

export function buildBoundMeasurementPoints(
  measurementType: string,
  keypoints: KeypointAnnotation[],
  existingPoints?: Point[]
): Point[] | null {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return null;
  return rule.buildMeasurementPoints(
    new Map(keypoints.map(keypoint => [keypoint.id, keypoint])),
    existingPoints
  );
}

export function writeMeasurementPointsToKeypoints(
  keypoints: KeypointAnnotation[],
  measurementType: string,
  points: Point[],
  changedPointIndex?: number
): KeypointAnnotation[] {
  const rule = getMeasurementKeypointBindingRule(measurementType);
  if (!rule) return keypoints;

  return rule.getKeypointUpdates(points, changedPointIndex).reduce(
    (current, update) =>
      upsertKeypoint(current, {
        id: update.keypointId,
        point: { ...update.point },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      }),
    keypoints
  );
}

export function backfillMissingBoundKeypoints(
  keypoints: KeypointAnnotation[],
  measurements: MeasurementData[]
): KeypointAnnotation[] {
  let nextKeypoints = keypoints;

  for (const measurement of measurements) {
    const rule = getMeasurementKeypointBindingRule(measurement.type);
    if (!rule) continue;

    const existingIds = new Set(nextKeypoints.map(keypoint => keypoint.id));
    const missingIds = new Set(
      rule.requiredKeypointIds.filter(
        keypointId => !existingIds.has(keypointId)
      )
    );
    if (missingIds.size === 0) continue;

    const updates = rule
      .getKeypointUpdates(measurement.points)
      .filter(update => missingIds.has(update.keypointId));
    for (const update of updates) {
      nextKeypoints = upsertKeypoint(nextKeypoints, {
        id: update.keypointId,
        point: { ...update.point },
        source: AnnotationSource.MANUAL,
        confidence: 1,
      });
    }
  }

  return nextKeypoints;
}
