import {
  createManualPointRef,
  getSyncGroupsForPoint,
  validateAnnotationBindings,
  type PointRef,
  type ManualPointRef,
} from '@xiehe/imaging-core/bindings';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { recalculateSnapshot } from './editorSnapshot';

/** 与 Web 交互约定一致：合并已有组，以最后选中的点作为位置锚点。 */
export function bindSelectedPoints(
  snapshot: AnnotationEditorSnapshot,
  points: PointRef[],
  id: string,
  context: CalculationContext
): AnnotationEditorSnapshot {
  const bindings = validateAnnotationBindings(
    snapshot.pointBindings,
    snapshot.measurements
  );
  const selected = points.flatMap(point => {
    const measurement = snapshot.measurements.find(
      item => item.id === point.annotationId
    );
    const member = measurement
      ? createManualPointRef(measurement, point.pointIndex)
      : null;
    return member ? [member] : [];
  });
  if (
    new Set(selected.map(point => `${point.annotationId}:${point.pointIndex}`))
      .size < 2
  )
    throw new Error('请选择至少两个不同的测量点位');
  const overlapping = new Set(
    selected.flatMap(point =>
      getSyncGroupsForPoint(point.annotationId, point.pointIndex, bindings).map(
        group => group.id
      )
    )
  );
  const members = new Map<string, ManualPointRef>();
  bindings.syncGroups
    .filter(group => overlapping.has(group.id))
    .forEach(group =>
      group.members.forEach(point =>
        members.set(`${point.annotationId}:${point.pointIndex}`, point)
      )
    );
  selected.forEach(point =>
    members.set(`${point.annotationId}:${point.pointIndex}`, point)
  );
  const anchor = selected[selected.length - 1];
  const anchorPoint = snapshot.measurements.find(
    item => item.id === anchor.annotationId
  )!.points[anchor.pointIndex];
  const next = {
    ...snapshot,
    pointBindings: {
      ...bindings,
      syncGroups: [
        ...bindings.syncGroups.filter(group => !overlapping.has(group.id)),
        {
          id,
          name: `手动绑定组 ${bindings.syncGroups.length + 1}`,
          color: '#22d3ee',
          source: 'manual' as const,
          members: [...members.values()],
        },
      ],
    },
    measurements: snapshot.measurements.map(measurement => ({
      ...measurement,
      points: measurement.points.map((point, index) =>
        members.has(`${measurement.id}:${index}`) ? { ...anchorPoint } : point
      ),
    })),
  };
  return recalculateSnapshot(next, context, snapshot);
}
