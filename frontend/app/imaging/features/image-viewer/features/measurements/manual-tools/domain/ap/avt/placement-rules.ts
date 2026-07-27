import { createAvtMetadata, getAvtTargetLabel } from './target-rules';
import type { AvtPlacementSession, AvtPlacementStep, AvtTarget } from './types';

const C7PL_PLACEMENT_KEYPOINT_IDS = ['C7-1', 'C7-2', 'C7-3', 'C7-4'] as const;
const CSVL_PLACEMENT_KEYPOINT_IDS = ['SL', 'SR'] as const;

export function getAvtReferencePlacementKeypointIds(
  target: AvtTarget
): readonly string[] {
  return createAvtMetadata(target).referenceLine === 'c7pl'
    ? C7PL_PLACEMENT_KEYPOINT_IDS
    : CSVL_PLACEMENT_KEYPOINT_IDS;
}

export function getAvtTargetPlacementKeypointIds(
  target: AvtTarget
): readonly string[] {
  return target.type === 'vertebra'
    ? [1, 2, 3, 4].map(index => `${target.vertebra}-${index}`)
    : [];
}

function getPendingKeypointStep(
  phase: Extract<AvtPlacementStep, { kind: 'keypoint' }>['phase'],
  label: string,
  orderedKeypointIds: readonly string[],
  existingKeypointIds: ReadonlySet<string>
): AvtPlacementStep | null {
  const keypointId = orderedKeypointIds.find(
    candidate => !existingKeypointIds.has(candidate)
  );
  if (!keypointId) return null;

  return {
    kind: 'keypoint',
    phase,
    label,
    keypointId,
    completedCount: orderedKeypointIds.filter(candidate =>
      existingKeypointIds.has(candidate)
    ).length,
    totalCount: orderedKeypointIds.length,
  };
}

/**
 * AVT 手动创建的点位顺序是稳定交互契约：
 * 先补 C7PL/CSVL 参考点，再补目标椎体点，最后才允许放置椎间盘 a、b。
 * 已存在的关键点只计入进度并跳过，不能改变后续点位的语义。
 */
export function createAvtPlacementSession(
  target: AvtTarget,
  existingKeypointIds: ReadonlySet<string>
): AvtPlacementSession | null {
  const metadata = createAvtMetadata(target);
  const referenceStep = getPendingKeypointStep(
    'reference',
    metadata.referenceLine === 'c7pl' ? 'C7PL' : 'CSVL',
    getAvtReferencePlacementKeypointIds(target),
    existingKeypointIds
  );
  if (referenceStep) return { target, step: referenceStep };

  if (target.type === 'vertebra') {
    const targetStep = getPendingKeypointStep(
      'target',
      target.vertebra,
      getAvtTargetPlacementKeypointIds(target),
      existingKeypointIds
    );
    return targetStep ? { target, step: targetStep } : null;
  }

  return {
    target,
    step: {
      kind: 'disc',
      label: getAvtTargetLabel(target),
    },
  };
}
