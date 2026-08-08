import {
  ANNOTATION_BINDING_SCHEMA_VERSION,
  type AnnotationBindings,
  type BindingMeasurement,
  createEmptyBindings,
  createManualPointRef,
  type ManualPointRef,
  validateAnnotationBindings,
} from './annotation-binding';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readLegacyMember(
  value: unknown,
  byId: Map<string, BindingMeasurement>
): ManualPointRef | null {
  if (!isRecord(value)) return null;
  const annotationId = value.annotationId;
  const pointIndex = value.pointIndex;
  if (typeof annotationId !== 'string' || typeof pointIndex !== 'number') {
    return null;
  }
  const measurement = byId.get(annotationId);
  return measurement
    ? createManualPointRef(measurement, pointIndex)
    : null;
}

function readVersionedMember(value: unknown): ManualPointRef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.annotationId !== 'string' ||
    typeof value.pointIndex !== 'number' ||
    typeof value.layoutFingerprint !== 'string'
  ) {
    return null;
  }
  return {
    annotationId: value.annotationId,
    pointIndex: value.pointIndex,
    layoutFingerprint: value.layoutFingerprint,
  };
}

/**
 * 将历史 pointBindings 升级为只包含手动绑定的 v2 结构。
 *
 * 历史版本把 S1、继承关系和坐标重合产生的 pos-* 自动组与用户手动组一起
 * 持久化，并且成员只保存 measurementId + pointIndex。旧单 FH PI/PT 的
 * points[1]/points[2] 是 S1 两端，而双 FH 六点布局中的相同下标已经变成
 * FH-1 半径点和 FH-2 圆心。继续恢复这些自动组会把旧解剖语义错误套到新
 * 布局，因此迁移时必须丢弃全部自动组，只允许显式 manual-* 组继续存在。
 *
 * 旧手动组没有布局指纹，只能以当前加载快照作为其原始布局补齐一次指纹；
 * 之后任何点数、端椎或工具 metadata 变化都会使它安全失效。
 */
export function migrateAnnotationBindings(
  value: unknown,
  measurements: readonly BindingMeasurement[]
): AnnotationBindings {
  if (!isRecord(value) || !Array.isArray(value.syncGroups)) {
    return createEmptyBindings();
  }

  const isVersioned =
    value.schemaVersion === ANNOTATION_BINDING_SCHEMA_VERSION;
  const byId = new Map(
    measurements.map(measurement => [measurement.id, measurement])
  );
  const syncGroups = value.syncGroups.flatMap(rawGroup => {
    if (!isRecord(rawGroup) || typeof rawGroup.id !== 'string') return [];

    const isManualGroup = isVersioned
      ? rawGroup.source === 'manual'
      : rawGroup.id.startsWith('manual-');
    if (!isManualGroup || !Array.isArray(rawGroup.members)) return [];

    const members = rawGroup.members.flatMap(rawMember => {
      const member = isVersioned
        ? readVersionedMember(rawMember)
        : readLegacyMember(rawMember, byId);
      return member ? [member] : [];
    });
    if (members.length < 2) return [];

    return [
      {
        id: rawGroup.id,
        name:
          typeof rawGroup.name === 'string' ? rawGroup.name : '手动绑定组',
        color:
          typeof rawGroup.color === 'string' ? rawGroup.color : '#22d3ee',
        source: 'manual' as const,
        members,
      },
    ];
  });

  return validateAnnotationBindings(
    {
      schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
      syncGroups,
    },
    measurements
  );
}
