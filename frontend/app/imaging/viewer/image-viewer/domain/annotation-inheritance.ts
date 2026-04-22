/**
 * 标注点位继承与共享解剖点规则。
 * 这一层只保留纯规则与纯数据变换。
 */

import { ANNOTATION_CONFIGS } from '../catalog/annotation-catalog';
import { Point } from '../types';
import {
  AnnotationBindings,
  PointSyncGroup,
} from './annotation-binding';

export interface PointInheritanceRule {
  /** 提供点的标注类型名称（measurement.type，与工具 name 对应） */
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
  'c7-offset': [
    // 优先级低：从 TTS 的骶骨参考点（索引2-3）继承
    {
      fromType: 'TTS',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [4, 5],
    },
    // 优先级高：直接从 CSS（骶骨倾斜）继承，会覆盖上面 TTS 的继承
    {
      fromType: 'CSS',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [4, 5],
    },
  ],
  tts: [
    // 从 CSS（骶骨倾斜）继承骶骨参考点
    {
      fromType: 'CSS',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [2, 3],
    },
  ],
  sacral: [
    // 优先级低：从 TTS 的骶骨参考点（索引2-3）继承
    {
      fromType: 'TTS',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [0, 1],
    },
    // 优先级高：直接从 TS（C7 Offset）继承骶骨参考点，会覆盖上面 TTS 的继承
    {
      fromType: 'TS',
      sourcePointIndices: [4, 5],
      destinationPointIndices: [0, 1],
    },
  ],
  sva: [
    {
      fromType: 'C2-C7 CL',
      sourcePointIndices: [2, 3],
      destinationPointIndices: [0, 1],
    },
    {
      fromType: 'SS',
      sourcePointIndices: [1],
      destinationPointIndices: [4],
    },
  ],
  cl: [
    {
      fromType: 'SVA',
      sourcePointIndices: [0, 1],
      destinationPointIndices: [2, 3],
    },
  ],
  ss: [
    {
      fromType: 'SVA',
      sourcePointIndices: [4],
      destinationPointIndices: [1],
    },
  ],
};

export interface SharedAnatomicalPoint {
  /** 解剖结构名称，用于生成绑定组名 */
  name: string;
  /** 绑定组颜色 */
  color: string;
  /** 共享该解剖点的所有工具参与项 */
  participants: Array<{
    toolId: string;
    /** 工具对应的 measurement.type */
    typeName: string;
    /** 该点在 points[] 中的索引 */
    pointIndex: number;
  }>;
}

/**
 * 侧位共享解剖点组
 * - L1上缘左端点:  LL L1-L4[0] / LL L1-S1[0]
 * - L1上缘右端点:  LL L1-L4[1] / LL L1-S1[1]
 * - S1上缘左端点:  LL L1-S1[2] / LL L4-S1[2] / TPA[5] / PI[1] / PT[1] / SS[0]
 * - S1上缘右端点:  LL L1-S1[3] / LL L4-S1[3] / TPA[6] / PI[2] / PT[2] / SS[1]
 * - T1椎体中心:    TPA[4] / PI[0] / PT[0]
 */
export const SHARED_ANATOMICAL_POINT_GROUPS: SharedAnatomicalPoint[] = [
  {
    name: 'L1上缘-左端点',
    color: '#fb7185',
    participants: [
      { toolId: 'll-l1-l4', typeName: 'LL L1-L4', pointIndex: 0 },
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 0 },
    ],
  },
  {
    name: 'L1上缘-右端点',
    color: '#fb7185',
    participants: [
      { toolId: 'll-l1-l4', typeName: 'LL L1-L4', pointIndex: 1 },
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 1 },
    ],
  },
  {
    name: 'S1上缘-左端点',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 2 },
      { toolId: 'll-l4-s1', typeName: 'LL L4-S1', pointIndex: 2 },
      { toolId: 'tpa', typeName: 'TPA', pointIndex: 5 },
      { toolId: 'pi', typeName: 'PI', pointIndex: 1 },
      { toolId: 'pt', typeName: 'PT', pointIndex: 1 },
      { toolId: 'ss', typeName: 'SS', pointIndex: 0 },
    ],
  },
  {
    name: 'S1上缘-右端点',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 3 },
      { toolId: 'll-l4-s1', typeName: 'LL L4-S1', pointIndex: 3 },
      { toolId: 'tpa', typeName: 'TPA', pointIndex: 6 },
      { toolId: 'pi', typeName: 'PI', pointIndex: 2 },
      { toolId: 'pt', typeName: 'PT', pointIndex: 2 },
      { toolId: 'ss', typeName: 'SS', pointIndex: 1 },
    ],
  },
  {
    name: 'S1中心和股骨中心',
    color: '#a855f7',
    participants: [
      { toolId: 'tpa', typeName: 'TPA', pointIndex: 4 },
      { toolId: 'pi', typeName: 'PI', pointIndex: 0 },
      { toolId: 'pt', typeName: 'PT', pointIndex: 0 },
    ],
  },
];

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
  measurements: { type: string; points: Point[] }[]
): { points: Point[]; count: number } {
  const inherited = new Map<number, Point>();

  const asymRules = POINT_INHERITANCE_RULES[toolId] || [];
  for (const rule of asymRules) {
    const source = measurements.find(measurement => measurement.type === rule.fromType);
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
        measurement => measurement.type === participant.typeName
      );
      if (source && participant.pointIndex < source.points.length) {
        inherited.set(mine.pointIndex, source.points[participant.pointIndex]);
        break;
      }
    }
  }

  const sorted = Array.from(inherited.entries()).sort((left, right) => left[0] - right[0]);
  return { points: sorted.map(([, point]) => point), count: sorted.length };
}

/**
 * 对所有标注自动创建继承点的同步绑定组。
 * 处理两类来源：
 *   1. POINT_INHERITANCE_RULES  — 非对称（单向）继承
 *   2. SHARED_ANATOMICAL_POINT_GROUPS — 对称（N:N）共享解剖点
 */
export function autoCreateInheritanceBindings(
  measurements: { id: string; type: string; points: Point[] }[],
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
    const targetTypeName = targetConfig.name;

    const targetMeasurements = measurements.filter(
      measurement => measurement.type === targetTypeName
    );
    if (targetMeasurements.length === 0) continue;

    for (const rule of rules) {
      const sourceMeasurements = measurements.filter(
        measurement => measurement.type === rule.fromType
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
            `继承绑定(${rule.fromType}→${targetTypeName})-点${srcIdx + 1}`,
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
        item => item.type === participant.typeName
      );
      if (measurement && participant.pointIndex < measurement.points.length) {
        present.push({ mId: measurement.id, ptIdx: participant.pointIndex });
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

/**
 * 获取工具的实际所需点击次数（扣除可继承点位后的净需求）
 */
export function getEffectivePointsNeeded(
  toolId: string,
  totalPointsNeeded: number,
  measurements: { type: string; points: Point[] }[]
): number {
  const { count } = getInheritedPoints(toolId, measurements);
  return Math.max(0, totalPointsNeeded - count);
}
