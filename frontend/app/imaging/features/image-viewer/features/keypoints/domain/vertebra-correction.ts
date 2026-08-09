import { AnnotationSource } from '@xiehe/imaging-core/contracts';
import {
  getMeasurementDeriveVertebraOrder,
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
} from '@xiehe/imaging-core/anatomy';
import {
  type KeypointAnnotation,
  sortKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint';
import { getKeypointGroupsForExamType } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-label';

export type VertebraCornerSequenceNumber = 1 | 2 | 3 | 4;

export interface VertebraCornerOrderMapping {
  from: VertebraCornerSequenceNumber;
  to: VertebraCornerSequenceNumber;
}

export type VertebraLabelOffsetDirection = 'up' | 'down';

export interface VertebraLabelOffsetOptions {
  examType: string;
  startVertebra: string;
  endVertebra: string;
  direction: VertebraLabelOffsetDirection;
  offset: number;
}

export type ShiftVertebraLabelsResult =
  | {
      ok: true;
      keypoints: KeypointAnnotation[];
      vertebraLabelMap: Map<string, string>;
    }
  | {
      ok: false;
      reason:
        | 'invalid-offset'
        | 'invalid-range'
        | 'out-of-range'
        | 'target-keypoint-unavailable';
      targetVertebraLabels?: string[];
      targetKeypointIds?: string[];
    };

export type RectifyVertebraCornerOrderResult =
  | { ok: true; keypoints: KeypointAnnotation[] }
  | {
      ok: false;
      missingSequenceNumbers: VertebraCornerSequenceNumber[];
    };

const VERTEBRA_CORNER_SEQUENCE_NUMBERS = [1, 2, 3, 4] as const;

function getAvailableVertebraGroupMap(examType: string) {
  return new Map(
    getKeypointGroupsForExamType(examType)
      .filter(group => getMeasurementDeriveVertebraOrder(group.name) !== null)
      .map(group => [group.name, group])
  );
}

function getVertebraLabelAtOrder(order: number): string | null {
  return MEASUREMENT_DERIVE_VERTEBRA_ORDER[order - 1] ?? null;
}

function getShiftedVertebraLabel(
  vertebra: string,
  direction: VertebraLabelOffsetDirection,
  offset: number
): string | null {
  const order = getMeasurementDeriveVertebraOrder(vertebra);
  if (order === null) return null;
  const targetOrder = direction === 'up' ? order - offset : order + offset;
  return getVertebraLabelAtOrder(targetOrder);
}

function parseVertebraKeypointId(
  keypointId: string
): { vertebra: string; pointNumber: string } | null {
  const match = /^([A-Z]\d+)-(.+)$/.exec(keypointId);
  if (!match) return null;
  return {
    vertebra: match[1],
    pointNumber: match[2],
  };
}

/** 按生理学顺序整体偏移关键点标签，坐标保持不变。 */
export function shiftVertebraLabels(
  keypoints: KeypointAnnotation[],
  options: VertebraLabelOffsetOptions
): ShiftVertebraLabelsResult {
  const offset = Number(options.offset);
  if (!Number.isInteger(offset) || offset <= 0) {
    return { ok: false, reason: 'invalid-offset' };
  }

  const startOrder = getMeasurementDeriveVertebraOrder(options.startVertebra);
  const endOrder = getMeasurementDeriveVertebraOrder(options.endVertebra);
  if (startOrder === null || endOrder === null || startOrder > endOrder) {
    return { ok: false, reason: 'invalid-range' };
  }

  const availableGroupMap = getAvailableVertebraGroupMap(options.examType);
  if (
    !availableGroupMap.has(options.startVertebra) ||
    !availableGroupMap.has(options.endVertebra)
  ) {
    return { ok: false, reason: 'invalid-range' };
  }

  const availableKeypointIds = new Set<string>();
  availableGroupMap.forEach(group => {
    group.keypoints.forEach(keypoint => availableKeypointIds.add(keypoint.id));
  });

  const vertebraLabelMap = new Map<string, string>();
  const outOfRangeTargets: string[] = [];
  for (let order = startOrder; order <= endOrder; order += 1) {
    const sourceLabel = getVertebraLabelAtOrder(order);
    if (!sourceLabel) continue;

    const targetLabel = getShiftedVertebraLabel(
      sourceLabel,
      options.direction,
      offset
    );
    if (!targetLabel || !availableGroupMap.has(targetLabel)) {
      outOfRangeTargets.push(
        targetLabel ?? `${sourceLabel}${options.direction}`
      );
      continue;
    }
    vertebraLabelMap.set(sourceLabel, targetLabel);
  }

  if (outOfRangeTargets.length > 0) {
    return {
      ok: false,
      reason: 'out-of-range',
      targetVertebraLabels: outOfRangeTargets,
    };
  }

  const shiftedKeypoints: KeypointAnnotation[] = [];
  const unavailableTargetKeypointIds: string[] = [];
  keypoints.forEach(keypoint => {
    const parsed = parseVertebraKeypointId(keypoint.id);
    const targetVertebra = parsed
      ? vertebraLabelMap.get(parsed.vertebra)
      : undefined;
    if (!parsed || !targetVertebra) return;

    const targetKeypointId = `${targetVertebra}-${parsed.pointNumber}`;
    if (!availableKeypointIds.has(targetKeypointId)) {
      unavailableTargetKeypointIds.push(targetKeypointId);
      return;
    }
    shiftedKeypoints.push({
      ...keypoint,
      id: targetKeypointId,
      source: AnnotationSource.MANUAL,
    });
  });

  if (unavailableTargetKeypointIds.length > 0) {
    return {
      ok: false,
      reason: 'target-keypoint-unavailable',
      targetKeypointIds: Array.from(new Set(unavailableTargetKeypointIds)),
    };
  }

  const shiftedSourceIds = new Set(
    keypoints
      .filter(keypoint => {
        const parsed = parseVertebraKeypointId(keypoint.id);
        return parsed ? vertebraLabelMap.has(parsed.vertebra) : false;
      })
      .map(keypoint => keypoint.id)
  );
  const byId = new Map<string, KeypointAnnotation>();
  keypoints.forEach(keypoint => {
    if (!shiftedSourceIds.has(keypoint.id)) {
      byId.set(keypoint.id, keypoint);
    }
  });
  shiftedKeypoints.forEach(keypoint => byId.set(keypoint.id, keypoint));

  return {
    ok: true,
    keypoints: sortKeypoints(Array.from(byId.values())),
    vertebraLabelMap,
  };
}

function getMissingVertebraCornerSequenceNumbers(
  mapping: VertebraCornerOrderMapping[]
): VertebraCornerSequenceNumber[] {
  const targets = new Set(mapping.map(item => item.to));
  return VERTEBRA_CORNER_SEQUENCE_NUMBERS.filter(index => !targets.has(index));
}

/** 仅交换同一椎体四个角点的标签，点坐标随实体一起迁移。 */
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
