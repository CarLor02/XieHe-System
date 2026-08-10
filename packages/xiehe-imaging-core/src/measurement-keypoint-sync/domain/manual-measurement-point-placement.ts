import type { Point } from '../../shared/domain/contracts';
import { constrainPointHorizontally } from '../../shared/domain/geometry';

export type ManualMeasurementPointPlacementConstraint =
  | { kind: 'free' }
  | { kind: 'horizontal'; anchorPointIndex: number };

/**
 * 手动测量点的放置约束表。
 *
 * TTS 只有医生手工确定的躯干线 points[0..1] 必须水平。points[2..3]
 * 对应真实的 SL/SR，与 CSS 共用关键点，不能为了显示而改写其 Y 坐标。
 * TS 的 C7 四角和 SL/SR 均是解剖点，因此没有放置约束。
 */
const MANUAL_MEASUREMENT_POINT_PLACEMENT_RULES: Readonly<
  Record<
    string,
    Readonly<Record<number, ManualMeasurementPointPlacementConstraint>>
  >
> = {
  tts: {
    1: { kind: 'horizontal', anchorPointIndex: 0 },
  },
};

export function getManualMeasurementPointPlacementConstraint(
  toolId: string,
  pointIndex: number
): ManualMeasurementPointPlacementConstraint {
  return (
    MANUAL_MEASUREMENT_POINT_PLACEMENT_RULES[toolId]?.[pointIndex] ?? {
      kind: 'free',
    }
  );
}

export function applyManualMeasurementPointPlacementConstraint({
  constraint,
  pointsByIndex,
  rawPoint,
}: {
  constraint: ManualMeasurementPointPlacementConstraint;
  pointsByIndex: ReadonlyMap<number, Point>;
  rawPoint: Point;
}): Point {
  if (constraint.kind === 'horizontal') {
    const anchor = pointsByIndex.get(constraint.anchorPointIndex);
    if (anchor) {
      return constrainPointHorizontally(rawPoint, anchor);
    }
  }

  return { ...rawPoint };
}
