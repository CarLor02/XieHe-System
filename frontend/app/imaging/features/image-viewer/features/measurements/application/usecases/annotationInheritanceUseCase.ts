/**
 * 标注点位继承与共享解剖点规则。
 * 规则表保持纯数据，绑定组创建属于跨测量项的应用编排。
 */

import {
  ANNOTATION_CONFIGS,
  getAnnotationDisplayName,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  AnnotationBindings,
  getS1BindingPointMap,
  PointSyncGroup,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';

export interface PointInheritanceRule {
  /** 提供点的标注英文 key（measurement.type） */
  fromType: string;
  /** 从源标注中取哪些点（按索引） */
  sourcePointIndices: number[];
  /** 继承的点在目标标注 points[] 中的落地索引（与 sourcePointIndices 一一对应） */
  destinationPointIndices: number[];
}

/**
 * 点位继承规则表
 * key: 目标工具 ID
 */
export const POINT_INHERITANCE_RULES: Record<
  string,
  PointInheritanceRule[]
> = {
  'ts': [
    // 优先级低：从 TTS 的骶骨参考点（索引2-3）继承
    {
      fromType: 'tts',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [4, 5],
    },
    // 优先级高：直接从 CSS（骶骨倾斜）继承，会覆盖上面 TTS 的继承
    {
      fromType: 'css',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [4, 5],
    },
  ],
  tts: [
    // 从 CSS（骶骨倾斜）继承骶骨参考点
    {
      fromType: 'css',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [2, 3],
    },
  ],
  css: [
    // 优先级低：从 TTS 的骶骨参考点（索引2-3）继承
    {
      fromType: 'tts',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [0, 1],
    },
    // 优先级高：直接从 TS 继承骶骨参考点，会覆盖上面 TTS 的继承
    {
      fromType: 'ts',
      sourcePointIndices: [4, 5],
      destinationPointIndices: [0, 1],
    },
  ],
  sva: [
    {
      fromType: 'cl',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [0, 1],
    },
    {
      fromType: 'ss',
      sourcePointIndices: [1],
      destinationPointIndices: [4],
    },
  ],
  cl: [
    {
      fromType: 'sva',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [2, 3],
    },
  ],
  ss: [
    {
      fromType: 'sva',
      sourcePointIndices: [4],
      destinationPointIndices: [1],
    },
  ],
};

export interface SharedAnatomicalPoint {
  /** 解剖结构名称，用于生成绑定组名 */
  name: string;
  /**
   * 动态点位语义。PI/PT 的历史单 FH 与新双 FH 使用不同 points[] 槽位，
   * 不能只依赖 participant.pointIndex 的旧三点默认值。
   */
  role?: 's1-left' | 's1-right' | 'effective-cfh';
  /** 绑定组颜色 */
  color: string;
  /** 共享该解剖点的所有工具参与项 */
  participants: Array<{
    toolId: string;
    /** 工具对应的 measurement.type 英文 key */
    typeName: string;
    /** 该点在 points[] 中的索引 */
    pointIndex: number;
  }>;
}

/**
 * 侧位共享解剖点组
 * - L1上缘左端点:  LL L1-L4[0] / LL L1-S1[0]
 * - L1上缘右端点:  LL L1-L4[1] / LL L1-S1[1]
 * - S1上缘左端点:  LL L1-S1[2] / LL L4-S1[2] / TPA[5] / PI/PT动态槽位 / SS[0]
 * - S1上缘右端点:  LL L1-S1[3] / LL L4-S1[3] / TPA[6] / PI/PT动态槽位 / SS[1] / SVA[4]
 * - effectiveCFH:   TPA[4] / 单FH PI[0] / 单FH PT[0]
 *
 * 注：SVA[4] 是骶椎后缘参考点，与 S1上缘右端点（后缘/患者后方）重合，纳入同步组后
 * 拖动 SS/PI/PT 的对应点时 SVA 的骶椎参考点会自动跟随。
 */
export const SHARED_ANATOMICAL_POINT_GROUPS: SharedAnatomicalPoint[] = [
  {
    name: 'L1上缘-左端点',
    color: '#fb7185',
    participants: [
      { toolId: 'll-l1-l4', typeName: 'll-l1-l4', pointIndex: 0 },
      { toolId: 'll-l1-s1', typeName: 'll-l1-s1', pointIndex: 0 },
    ],
  },
  {
    name: 'L1上缘-右端点',
    color: '#fb7185',
    participants: [
      { toolId: 'll-l1-l4', typeName: 'll-l1-l4', pointIndex: 1 },
      { toolId: 'll-l1-s1', typeName: 'll-l1-s1', pointIndex: 1 },
    ],
  },
  {
    name: 'S1上缘-左端点',
    role: 's1-left',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'll-l1-s1', pointIndex: 2 },
      { toolId: 'll-l4-s1', typeName: 'll-l4-s1', pointIndex: 2 },
      { toolId: 'tpa', typeName: 'tpa', pointIndex: 5 },
      { toolId: 'pi', typeName: 'pi', pointIndex: 1 },
      { toolId: 'pt', typeName: 'pt', pointIndex: 1 },
      { toolId: 'ss', typeName: 'ss', pointIndex: 0 },
    ],
  },
  {
    name: 'S1上缘-右端点',
    role: 's1-right',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'll-l1-s1', pointIndex: 3 },
      { toolId: 'll-l4-s1', typeName: 'll-l4-s1', pointIndex: 3 },
      { toolId: 'tpa', typeName: 'tpa', pointIndex: 6 },
      { toolId: 'pi', typeName: 'pi', pointIndex: 2 },
      { toolId: 'pt', typeName: 'pt', pointIndex: 2 },
      { toolId: 'ss', typeName: 'ss', pointIndex: 1 },
      // SVA[4] = 骶椎后缘参考点，与 S1上缘右端点（后缘）同位，纳入绑定组
      { toolId: 'sva', typeName: 'sva', pointIndex: 4 },
    ],
  },
  {
    name: 'S1中心和股骨中心',
    role: 'effective-cfh',
    color: '#a855f7',
    participants: [
      { toolId: 'tpa', typeName: 'tpa', pointIndex: 4 },
      { toolId: 'pi', typeName: 'pi', pointIndex: 0 },
      { toolId: 'pt', typeName: 'pt', pointIndex: 0 },
    ],
  },
];

type InheritableMeasurement = Pick<
  MeasurementData,
  'id' | 'type' | 'points' | 'pelvicMetadata'
>;

/**
 * 将共享解剖点语义解析为某条测量项内的真实槽位。
 *
 * 历史 PI/PT 没有 pelvicMetadata，继续按 [CFH,S1-1,S1-2] 的 0/1/2
 * 槽位兼容；双 FH PI/PT 则必须把 S1 解析到 4/5。双 FH 的 effectiveCFH
 * 是 FH-1/FH-2 两圆心的派生中点，不对应任何一个可直接绑定的 points[] 槽位，
 * 因此这里返回 null，由关键点双向同步流程负责更新。
 */
function resolveSharedParticipantPointIndex(
  group: SharedAnatomicalPoint,
  participant: SharedAnatomicalPoint['participants'][number],
  measurement: InheritableMeasurement
): number | null {
  if (group.role === 's1-left' || group.role === 's1-right') {
    const s1Slots = getS1BindingPointMap(measurement);
    if (s1Slots) {
      return group.role === 's1-left' ? s1Slots.left : s1Slots.right;
    }
  }

  if (
    group.role === 'effective-cfh' &&
    (getAnnotationTypeId(measurement.type) === 'pi' ||
      getAnnotationTypeId(measurement.type) === 'pt') &&
    measurement.pelvicMetadata?.femoralHeadMode === 'bilateral'
  ) {
    return null;
  }

  return participant.pointIndex;
}

/**
 * 从已有标注中获取某工具可继承的点位。
 *
 * 来源优先级：POINT_INHERITANCE_RULES（非对称）> SHARED_ANATOMICAL_POINT_GROUPS（对称）
 *
 * 返回的 points 按 destinationIndex 升序排列。
 * 注意：当继承索引不连续时，调用方需要按 destinationIndex 回填到完整 points[]。
 */
export function getInheritedPoints(
  toolId: string,
  measurements: InheritableMeasurement[]
): { points: Point[]; count: number } {
  const inherited = getInheritedPointMap(toolId, measurements);
  const sorted = Array.from(inherited.entries()).sort(
    (left, right) => left[0] - right[0]
  );
  return { points: sorted.map(([, point]) => point), count: sorted.length };
}

export function getInheritedPointMap(
  toolId: string,
  measurements: InheritableMeasurement[]
): Map<number, Point> {
  const inherited = new Map<number, Point>();

  const asymRules = POINT_INHERITANCE_RULES[toolId] || [];
  for (const rule of asymRules) {
    const source = measurements.find(
      measurement => getAnnotationTypeId(measurement.type) === rule.fromType
    );
    if (source) {
      for (let index = 0; index < rule.sourcePointIndices.length; index += 1) {
        const srcIdx = rule.sourcePointIndices[index];
        const dstIdx = rule.destinationPointIndices[index];
        if (srcIdx < source.points.length) {
          inherited.set(dstIdx, source.points[srcIdx]);
        }
      }
    }
  }

  for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
    const mine = group.participants.find(participant => participant.toolId === toolId);
    if (!mine || inherited.has(mine.pointIndex)) continue;

    for (const participant of group.participants) {
      if (participant.toolId === toolId) continue;
      const source = measurements.find(
        measurement => getAnnotationTypeId(measurement.type) === participant.typeName
      );
      const sourcePointIndex = source
        ? resolveSharedParticipantPointIndex(group, participant, source)
        : null;
      if (
        source &&
        sourcePointIndex !== null &&
        sourcePointIndex < source.points.length
      ) {
        inherited.set(mine.pointIndex, source.points[sourcePointIndex]);
        break;
      }
    }
  }

  return inherited;
}

/**
 * 对所有标注自动创建继承点的同步绑定组。
 * 处理两类来源：
 *   1. POINT_INHERITANCE_RULES  — 非对称（单向）继承
 *   2. SHARED_ANATOMICAL_POINT_GROUPS — 对称（N:N）共享解剖点
 */
export function autoCreateInheritanceBindings(
  measurements: InheritableMeasurement[],
  existingBindings: AnnotationBindings = { syncGroups: [] }
): AnnotationBindings {
  const groups: PointSyncGroup[] = existingBindings.syncGroups.map(group => ({
    ...group,
    members: [...group.members],
  }));
  let counter = 0;

  const findGroupIndex = (annotationId: string, pointIndex: number): number =>
    groups.findIndex(group =>
      group.members.some(
        member =>
          member.annotationId === annotationId && member.pointIndex === pointIndex
      )
    );

  const addIfAbsent = (
    groupIdx: number,
    annotationId: string,
    pointIndex: number
  ) => {
    if (
      !groups[groupIdx].members.some(
        member =>
          member.annotationId === annotationId && member.pointIndex === pointIndex
      )
    ) {
      groups[groupIdx].members.push({ annotationId, pointIndex });
    }
  };

  const mergeOrCreate = (
    aId: string,
    aPtIdx: number,
    bId: string,
    bPtIdx: number,
    groupIdPrefix: string,
    groupName: string,
    color: string
  ) => {
    const aGroupIndex = findGroupIndex(aId, aPtIdx);
    const bGroupIndex = findGroupIndex(bId, bPtIdx);

    if (aGroupIndex === -1 && bGroupIndex === -1) {
      counter += 1;
      groups.push({
        id: `${groupIdPrefix}-${counter}`,
        name: groupName,
        color,
        members: [
          { annotationId: aId, pointIndex: aPtIdx },
          { annotationId: bId, pointIndex: bPtIdx },
        ],
      });
    } else if (aGroupIndex !== -1 && bGroupIndex === -1) {
      addIfAbsent(aGroupIndex, bId, bPtIdx);
    } else if (aGroupIndex === -1 && bGroupIndex !== -1) {
      addIfAbsent(bGroupIndex, aId, aPtIdx);
    } else if (aGroupIndex !== bGroupIndex) {
      const bMembers = [...groups[bGroupIndex].members];
      groups.splice(bGroupIndex, 1);
      const newAGroupIndex = findGroupIndex(aId, aPtIdx);
      for (const member of bMembers) {
        addIfAbsent(newAGroupIndex, member.annotationId, member.pointIndex);
      }
    }
  };

  for (const [targetToolId, rules] of Object.entries(POINT_INHERITANCE_RULES)) {
    const targetConfig = ANNOTATION_CONFIGS[targetToolId];
    if (!targetConfig) continue;
    const targetTypeName = targetConfig.id;

    const targetMeasurements = measurements.filter(
      measurement => getAnnotationTypeId(measurement.type) === targetTypeName
    );
    if (targetMeasurements.length === 0) continue;

    for (const rule of rules) {
      const sourceMeasurements = measurements.filter(
        measurement => getAnnotationTypeId(measurement.type) === rule.fromType
      );
      if (sourceMeasurements.length === 0) continue;

      const source = sourceMeasurements[sourceMeasurements.length - 1];

      for (const target of targetMeasurements) {
        for (let index = 0; index < rule.sourcePointIndices.length; index += 1) {
          const srcIdx = rule.sourcePointIndices[index];
          const dstIdx = rule.destinationPointIndices[index];

          if (srcIdx >= source.points.length || dstIdx >= target.points.length) {
            continue;
          }

          mergeOrCreate(
            source.id,
            srcIdx,
            target.id,
            dstIdx,
            `inherit-${targetToolId}-${source.id}`,
            `继承绑定(${getAnnotationDisplayName(rule.fromType)}→${getAnnotationDisplayName(targetTypeName)})-点${srcIdx + 1}`,
            '#22d3ee'
          );
        }
      }
    }
  }

  for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
    const present: Array<{ mId: string; ptIdx: number }> = [];
    for (const participant of group.participants) {
      const measurement = measurements.find(
        item => getAnnotationTypeId(item.type) === participant.typeName
      );
      const pointIndex = measurement
        ? resolveSharedParticipantPointIndex(group, participant, measurement)
        : null;
      if (
        measurement &&
        pointIndex !== null &&
        pointIndex < measurement.points.length
      ) {
        present.push({ mId: measurement.id, ptIdx: pointIndex });
      }
    }
    if (present.length < 2) continue;

    const anchor = present[0];
    for (let index = 1; index < present.length; index += 1) {
      mergeOrCreate(
        anchor.mId,
        anchor.ptIdx,
        present[index].mId,
        present[index].ptIdx,
        `shared-${group.name.replace(/\s/g, '-')}`,
        `共享解剖点(${group.name})`,
        group.color
      );
    }
  }

  return { syncGroups: groups };
}
