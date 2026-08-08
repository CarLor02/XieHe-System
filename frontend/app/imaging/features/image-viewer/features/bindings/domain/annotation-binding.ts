import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';

export const ANNOTATION_BINDING_SCHEMA_VERSION = 2 as const;

/** 手动绑定模式中尚未提交的点引用。 */
export interface PointRef {
  annotationId: string;
  pointIndex: number;
}

/**
 * 已持久化的手动点引用。
 *
 * pointIndex 只在对应测量布局没有变化时才有意义，因此必须与创建绑定时的
 * layoutFingerprint 一起保存，不能跨工具布局版本直接复用。
 */
export interface ManualPointRef extends PointRef {
  layoutFingerprint: string;
}

/** 用户显式创建的同步点组。自动医学同步不进入该结构。 */
export interface PointSyncGroup {
  id: string;
  name: string;
  color: string;
  source: 'manual';
  members: ManualPointRef[];
}

/** 仅包含用户手动绑定的持久化配置。 */
export interface AnnotationBindings {
  schemaVersion: typeof ANNOTATION_BINDING_SCHEMA_VERSION;
  syncGroups: PointSyncGroup[];
}

export interface BindingMeasurement {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
  apexVertebra?: string | null;
  avtMetadata?: unknown;
  pelvicMetadata?: unknown;
}

/**
 * 生成测量点位布局指纹。
 *
 * 点数不足以区分所有布局：例如 PI/PT 的单 FH 与双 FH 使用不同语义槽位，
 * AVT 也会根据目标和参考线改变 points[] 含义。因此把会影响点位语义的
 * metadata 和端椎信息一并纳入指纹，布局变化时让旧手动绑定安全失效。
 */
export function getMeasurementLayoutFingerprint(
  measurement: BindingMeasurement
): string {
  return JSON.stringify({
    type: getAnnotationTypeId(measurement.type),
    pointCount: measurement.points.length,
    upperVertebra: measurement.upperVertebra ?? null,
    lowerVertebra: measurement.lowerVertebra ?? null,
    apexVertebra: measurement.apexVertebra ?? null,
    avtMetadata: measurement.avtMetadata ?? null,
    pelvicMetadata: measurement.pelvicMetadata ?? null,
  });
}

export function createManualPointRef(
  measurement: BindingMeasurement,
  pointIndex: number
): ManualPointRef | null {
  if (
    !Number.isInteger(pointIndex) ||
    pointIndex < 0 ||
    pointIndex >= measurement.points.length
  ) {
    return null;
  }

  return {
    annotationId: measurement.id,
    pointIndex,
    layoutFingerprint: getMeasurementLayoutFingerprint(measurement),
  };
}

export function createEmptyBindings(): AnnotationBindings {
  return {
    schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
    syncGroups: [],
  };
}

function isManualPointRefValid(
  member: ManualPointRef,
  measurement: BindingMeasurement | undefined
): boolean {
  return Boolean(
    measurement &&
      Number.isInteger(member.pointIndex) &&
      member.pointIndex >= 0 &&
      member.pointIndex < measurement.points.length &&
      member.layoutFingerprint ===
        getMeasurementLayoutFingerprint(measurement)
  );
}

/**
 * 按当前测量结构过滤失效的手动绑定。
 * 该函数不修改传入对象，供渲染、保存、历史快照和拖拽共同使用。
 */
export function validateAnnotationBindings(
  bindings: AnnotationBindings,
  measurements: readonly BindingMeasurement[]
): AnnotationBindings {
  const byId = new Map(
    measurements.map(measurement => [measurement.id, measurement])
  );
  const syncGroups = bindings.syncGroups
    .filter(group => group.source === 'manual')
    .map(group => {
      const seen = new Set<string>();
      const members = group.members.filter(member => {
        const key = `${member.annotationId}:${member.pointIndex}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return isManualPointRefValid(member, byId.get(member.annotationId));
      });
      return { ...group, members };
    })
    .filter(group => group.members.length >= 2);

  return {
    schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
    syncGroups,
  };
}

/** 返回包含该点的所有手动同步组。 */
export function getSyncGroupsForPoint(
  annotationId: string,
  pointIndex: number,
  bindings: AnnotationBindings
): PointSyncGroup[] {
  return bindings.syncGroups.filter(group =>
    group.members.some(
      member =>
        member.annotationId === annotationId &&
        member.pointIndex === pointIndex
    )
  );
}

export function getBindingIndicatorColor(
  annotationId: string,
  pointIndex: number,
  bindings: AnnotationBindings
): string | null {
  return (
    getSyncGroupsForPoint(annotationId, pointIndex, bindings)[0]?.color ?? null
  );
}

export function isMeasurementBound(
  annotationId: string,
  bindings: AnnotationBindings
): boolean {
  return bindings.syncGroups.some(group =>
    group.members.some(member => member.annotationId === annotationId)
  );
}

export function listBoundAnnotationIds(bindings: AnnotationBindings): string[] {
  const ids = new Set<string>();
  bindings.syncGroups.forEach(group => {
    group.members.forEach(member => ids.add(member.annotationId));
  });
  return Array.from(ids);
}

/**
 * 将用户显式创建的手动绑定传播到同组点。
 *
 * 医学测量之间的自动同步由 measurement-keypoint-sync 的解剖关键点依赖图
 * 负责，不允许再通过坐标重合或原始 pointIndex 在这里传播。
 */
export function applyPointBindings<T extends BindingMeasurement>(
  measurements: T[],
  movedAnnotationId: string,
  movedPointIndex: number,
  newX: number,
  newY: number,
  bindings: AnnotationBindings
): T[] {
  const validBindings = validateAnnotationBindings(bindings, measurements);
  const affectedGroups = getSyncGroupsForPoint(
    movedAnnotationId,
    movedPointIndex,
    validBindings
  );
  if (affectedGroups.length === 0) return measurements;

  const updated = measurements.map(measurement => ({
    ...measurement,
    points: measurement.points.map(point => ({ ...point })),
  })) as T[];

  affectedGroups.forEach(group => {
    group.members.forEach(member => {
      if (
        member.annotationId === movedAnnotationId &&
        member.pointIndex === movedPointIndex
      ) {
        return;
      }
      const target = updated.find(
        measurement => measurement.id === member.annotationId
      );
      if (target && member.pointIndex < target.points.length) {
        target.points[member.pointIndex] = { x: newX, y: newY };
      }
    });
  });

  return updated;
}
