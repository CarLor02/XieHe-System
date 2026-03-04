/**
 * 标注工具辅助函数
 * 用于简化ImageViewer.tsx中的标注相关逻辑
 */

import React from 'react';
import {
  AnnotationConfig,
  Point,
  CalculationContext,
  getAnnotationConfig,
  ANNOTATION_CONFIGS
} from './annotationConfig';
import {
  AnnotationBindings,
  PointSyncGroup,
} from './annotationBindingConfig';

/**
 * 根据标注类型和点位计算测量值
 */
export function calculateMeasurementValue(
  type: string,
  points: Point[],
  context: CalculationContext
): string {
  // 特殊处理：AI检测的标注（type格式：AI检测-L1-1）
  if (type.startsWith('AI检测-')) {
    // AI检测的标注不需要计算值，直接返回空字符串
    return '';
  }

  // 特殊处理：CobbN 类型使用 cobb 配置
  const configType = /^Cobb\d+$/i.test(type) ? 'cobb' : type;
  const config = getAnnotationConfig(configType);

  if (!config) {
    return '辅助标注';
  }

  const results = config.calculateResults(points, context);

  if (results.length === 0) {
    return '辅助标注';
  }

  // 如果有多个测量结果，返回第一个
  return `${results[0].value}${results[0].unit}`;
}

/**
 * 根据标注类型获取描述
 */
export function getDescriptionForType(type: string): string {
  // 特殊处理：AI检测的标注（type格式：AI检测-L1-1, AI检测-CFH等）
  if (type.startsWith('AI检测-')) {
    // AI检测的标注，description字段在创建时已经设置好了
    // 这里返回type本身作为默认值
    return type;
  }

  // 特殊处理：CobbN 类型
  if (/^Cobb\d+$/i.test(type)) {
    return 'Cobb角测量';
  }

  const config = getAnnotationConfig(type);
  return config?.description || type;
}

/**
 * 根据标注类型获取颜色
 */
export function getColorForType(type: string): string {
  // AI检测点使用特殊颜色
  if (type.startsWith('AI检测-')) {
    return '#22c55e'; // 绿色 - 用于AI检测的椎骨和关键点
  }

  const config = getAnnotationConfig(type);
  return config?.color || '#10b981'; // 默认绿色
}

/**
 * 根据标注类型获取标签位置
 */
export function getLabelPositionForType(type: string, points: Point[], imageScale: number): Point {
  const config = getAnnotationConfig(type);
  if (!config) {
    // 默认位置：第一个和最后一个点的中间
    if (points.length === 0) return { x: 0, y: 0 };
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    return {
      x: (firstPoint.x + lastPoint.x) / 2,
      y: (firstPoint.y + lastPoint.y) / 2 - 10 / imageScale
    };
  }
  return config.getLabelPosition(points, imageScale);
}

/**
 * 判断是否为辅助图形
 */
export function isAuxiliaryShape(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'auxiliary';
}

/**
 * 获取SVG特殊渲染元素
 */
export function renderSpecialSVGElements(
  type: string,
  screenPoints: Point[],
  displayColor: string,
  imageScale: number
): React.ReactNode | null {
  const config = getAnnotationConfig(type);
  if (!config || !config.renderSpecialElements) {
    return null;
  }
  return config.renderSpecialElements(screenPoints, displayColor, imageScale);
}

/**
 * 根据标注类型获取所需点数
 */
export function getPointsNeededForType(type: string): number {
  const config = getAnnotationConfig(type);
  return config?.pointsNeeded || 0;
}

/**
 * 检查标注类型是否为测量类型
 */
export function isMeasurementType(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'measurement';
}

/**
 * 检查标注类型是否为辅助标注
 */
export function isAuxiliaryType(type: string): boolean {
  const config = getAnnotationConfig(type);
  return config?.category === 'auxiliary';
}

/**
 * 获取标注类型的显示名称
 */
export function getDisplayName(type: string): string {
  const config = getAnnotationConfig(type);
  return config?.name || type;
}

/**
 * 生成默认测量值（用于创建新标注时）
 */
export function generateDefaultValue(
  type: string,
  points: Point[],
  context: CalculationContext
): string {
  const config = getAnnotationConfig(type);
  
  if (!config) {
    return '辅助标注';
  }
  
  if (config.category === 'auxiliary') {
    return '辅助标注';
  }
  
  // 如果点数不足，返回默认值
  if (points.length < config.pointsNeeded) {
    const results = config.calculateResults([], context);
    if (results.length > 0) {
      return `${results[0].value}${results[0].unit}`;
    }
    return '0.0°';
  }
  
  // 计算实际值
  const results = config.calculateResults(points, context);
  if (results.length > 0) {
    return `${results[0].value}${results[0].unit}`;
  }
  
  return '0.0°';
}

/**
 * 获取正位X光片的工具列表
 */
export function getAnteriorTools() {
  return [
    't1-tilt',
    'cobb',  // 统一的Cobb工具
    'ca',
    'pelvic',
    'sacral',
    'avt',
    'ts',
    'lld',
    'c7-offset',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

/**
 * 获取侧位X光片的工具列表
 */
export function getLateralTools() {
  return [
    't1-slope',
    'cl',
    'tk-t2-t5',
    'tk-t5-t12',
    'll-l1-s1',
    'll-l1-l4',
    'll-l4-s1',
    'tpa',
    'sva',
    'pi',
    'pt',
    'ss',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

/**
 * 获取通用工具列表
 */
export function getGenericTools() {
  return [
    'length',
    'angle',
    'circle',
    'ellipse',
    'rectangle',
    'arrow',
    'polygon',
    'vertebra-center',
    'aux-length',
    'aux-angle'
  ].map(id => {
    const config = ANNOTATION_CONFIGS[id];
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      pointsNeeded: config.pointsNeeded
    };
  });
}

// ==================== 点位继承机制 ====================

/**
 * 点位继承规则：某些工具可以从其他已完成的标注中自动复制点位，
 * 减少用户重复标注相同解剖结构。继承的点并自动与来源点建立同步绑定。
 */
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
export const POINT_INHERITANCE_RULES: Record<string, PointInheritanceRule[]> = {
  // C7 Offset（正面6点法）的第5、6个点复用骶骨倾斜角的两个标注点
  'c7-offset': [
    {
      fromType: 'Sacral',               // 骶骨倾斜角
      sourcePointIndices: [0, 1],        // 取骶骨标注的第1、2个点
      destinationPointIndices: [4, 5],   // 它们在 C7 Offset points[] 中的落地索引
    }
  ],
  // 反向：若 C7 Offset 先标注，骶骨倾斜角可从 C7 Offset 的第5、6个点中推导
  'sacral': [
    {
      fromType: 'C7 Offset',
      sourcePointIndices: [4, 5],        // C7 Offset 的参考线端点
      destinationPointIndices: [0, 1],   // 对应 Sacral 的两个端点
    }
  ]
};

// ==================== 对称共享解剖点 ====================

/**
 * 对称共享解剖点组：多个工具共享同一解剖位置。
 * 任意工具词标注完这些点后，其他工具将自动继承并建立正向绑定。
 */
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
 * - S1上缘左端点: LL L1-S1[2] / LL L4-S1[2] / TPA[5] / PI[1] / PT[1] / SS[0]
 * - S1上缘右端点: LL L1-S1[3] / LL L4-S1[3] / TPA[6] / PI[2] / PT[2] / SS[1]
 * - T1椎体中心:   TPA[4] / PI[0] / PT[0]
 */
export const SHARED_ANATOMICAL_POINT_GROUPS: SharedAnatomicalPoint[] = [
  {
    name: 'S1上缘-左端点',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 2 },
      { toolId: 'll-l4-s1', typeName: 'LL L4-S1', pointIndex: 2 },
      { toolId: 'tpa',      typeName: 'TPA',       pointIndex: 5 },
      { toolId: 'pi',       typeName: 'PI',        pointIndex: 1 },
      { toolId: 'pt',       typeName: 'PT',        pointIndex: 1 },
      { toolId: 'ss',       typeName: 'SS',        pointIndex: 0 },
    ]
  },
  {
    name: 'S1上缘-右端点',
    color: '#f59e0b',
    participants: [
      { toolId: 'll-l1-s1', typeName: 'LL L1-S1', pointIndex: 3 },
      { toolId: 'll-l4-s1', typeName: 'LL L4-S1', pointIndex: 3 },
      { toolId: 'tpa',      typeName: 'TPA',       pointIndex: 6 },
      { toolId: 'pi',       typeName: 'PI',        pointIndex: 2 },
      { toolId: 'pt',       typeName: 'PT',        pointIndex: 2 },
      { toolId: 'ss',       typeName: 'SS',        pointIndex: 1 },
    ]
  },
  {
    name: 'T1椎体中心',
    color: '#a855f7',
    participants: [
      { toolId: 'tpa', typeName: 'TPA', pointIndex: 4 },
      { toolId: 'pi',  typeName: 'PI',  pointIndex: 0 },
      { toolId: 'pt',  typeName: 'PT',  pointIndex: 0 },
    ]
  }
];

/**
 * 从已有标注中获取某工具可继承的点位。
 *
 * 来源优先级：POINT_INHERITANCE_RULES（非对称）> SHARED_ANATOMICAL_POINT_GROUPS（对称）
 *
 * 返回的 points 按 destinationIndex 升序排列，将被追加到用户手动点击点之后。
 * 注意：此机制假设继承点均位于目标 points[] 的末尾（高索引侧）。
 */
export function getInheritedPoints(
  toolId: string,
  measurements: { type: string; points: any[] }[]
): { points: any[]; count: number } {
  // 用 Map 记录 destinationIndex → point，自动去重
  const inherited = new Map<number, any>();

  // 1. 非对称规则（POINT_INHERITANCE_RULES）
  const asymRules = POINT_INHERITANCE_RULES[toolId] || [];
  for (const rule of asymRules) {
    const source = measurements.find(m => m.type === rule.fromType);
    if (source) {
      for (let i = 0; i < rule.sourcePointIndices.length; i++) {
        const srcIdx = rule.sourcePointIndices[i];
        const dstIdx = rule.destinationPointIndices[i];
        if (srcIdx < source.points.length) {
          inherited.set(dstIdx, source.points[srcIdx]);
        }
      }
    }
  }

  // 2. 对称共享解剖点（SHARED_ANATOMICAL_POINT_GROUPS）
  for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
    const my = group.participants.find(p => p.toolId === toolId);
    if (!my || inherited.has(my.pointIndex)) continue; // 已由非对称规则填充过

    // 找任意一个已标注的参与方作为来源
    for (const p of group.participants) {
      if (p.toolId === toolId) continue;
      const source = measurements.find(m => m.type === p.typeName);
      if (source && p.pointIndex < source.points.length) {
        inherited.set(my.pointIndex, source.points[p.pointIndex]);
        break;
      }
    }
  }

  // 按 destinationIndex 升序返回
  const sorted = Array.from(inherited.entries()).sort((a, b) => a[0] - b[0]);
  return { points: sorted.map(([, pt]) => pt), count: sorted.length };
}

/**
 * 对所有标注自动创建继承点的同步绑定组。
 * 处理两类来源：
 *   1. POINT_INHERITANCE_RULES  — 非对称（单向）继承
 *   2. SHARED_ANATOMICAL_POINT_GROUPS — 对称（N:N）共享解剖点
 */
export function autoCreateInheritanceBindings(
  measurements: { id: string; type: string; points: any[] }[],
  existingBindings: AnnotationBindings = { syncGroups: [] }
): AnnotationBindings {
  // 深拷贝已有组，后续在其基础上就地修改
  const groups: PointSyncGroup[] = existingBindings.syncGroups.map(g => ({
    ...g,
    members: [...g.members],
  }));
  let counter = 0;

  // 查承某点所在组的索引
  const findGroupIndex = (annotationId: string, pointIndex: number): number =>
    groups.findIndex(g =>
      g.members.some(m => m.annotationId === annotationId && m.pointIndex === pointIndex)
    );

  // 向组中添加成员（若尚不存在）
  const addIfAbsent = (groupIdx: number, annotationId: string, pointIndex: number) => {
    if (!groups[groupIdx].members.some(m => m.annotationId === annotationId && m.pointIndex === pointIndex)) {
      groups[groupIdx].members.push({ annotationId, pointIndex });
    }
  };

  /**
   * 将两个点合并进同一绑定组（四情况：都新建、并入已有组、两组合并）。
   */
  const mergeOrCreate = (
    aId: string, aPtIdx: number,
    bId: string, bPtIdx: number,
    groupIdPrefix: string, groupName: string, color: string
  ) => {
    const aGIdx = findGroupIndex(aId, aPtIdx);
    const bGIdx = findGroupIndex(bId, bPtIdx);

    if (aGIdx === -1 && bGIdx === -1) {
      counter++;
      groups.push({
        id: `${groupIdPrefix}-${counter}`,
        name: groupName,
        color,
        members: [
          { annotationId: aId, pointIndex: aPtIdx },
          { annotationId: bId, pointIndex: bPtIdx },
        ],
      });
    } else if (aGIdx !== -1 && bGIdx === -1) {
      addIfAbsent(aGIdx, bId, bPtIdx);
    } else if (aGIdx === -1 && bGIdx !== -1) {
      addIfAbsent(bGIdx, aId, aPtIdx);
    } else if (aGIdx !== bGIdx) {
      // 两点分属不同组 → 将 bGIdx 的所有成员并入 aGIdx，删除 bGIdx
      const bMembers = [...groups[bGIdx].members];
      groups.splice(bGIdx, 1);
      const newAGIdx = findGroupIndex(aId, aPtIdx); // splice 后重新查找
      for (const m of bMembers) addIfAbsent(newAGIdx, m.annotationId, m.pointIndex);
    }
    // 已在同一组：无需操作
  };

  // --- 1. 非对称继承规则 (POINT_INHERITANCE_RULES) ---
  for (const [targetToolId, rules] of Object.entries(POINT_INHERITANCE_RULES)) {
    const targetConfig = ANNOTATION_CONFIGS[targetToolId];
    if (!targetConfig) continue;
    const targetTypeName = targetConfig.name;

    const targetMeasurements = measurements.filter(m => m.type === targetTypeName);
    if (targetMeasurements.length === 0) continue;

    for (const rule of rules) {
      const sourceMeasurements = measurements.filter(m => m.type === rule.fromType);
      if (sourceMeasurements.length === 0) continue;

      const source = sourceMeasurements[sourceMeasurements.length - 1];

      for (const target of targetMeasurements) {
        for (let i = 0; i < rule.sourcePointIndices.length; i++) {
          const srcIdx = rule.sourcePointIndices[i];
          const dstIdx = rule.destinationPointIndices[i];

          if (srcIdx >= source.points.length || dstIdx >= target.points.length) continue;

          mergeOrCreate(
            source.id, srcIdx,
            target.id, dstIdx,
            `inherit-${targetToolId}-${source.id}`,
            `继承绑定(${rule.fromType}→${targetTypeName})-点${srcIdx + 1}`,
            '#22d3ee'
          );
        }
      }
    }
  }

  // --- 2. 对称共享解剖点 (SHARED_ANATOMICAL_POINT_GROUPS) ---
  for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
    // 收集已存在且具备该点的标注
    const present: Array<{ mId: string; ptIdx: number }> = [];
    for (const p of group.participants) {
      const m = measurements.find(ms => ms.type === p.typeName);
      if (m && p.pointIndex < m.points.length) {
        present.push({ mId: m.id, ptIdx: p.pointIndex });
      }
    }
    if (present.length < 2) continue;

    // 以第一个为锚点，将其余全部并入同一组
    const anchor = present[0];
    for (let i = 1; i < present.length; i++) {
      mergeOrCreate(
        anchor.mId, anchor.ptIdx,
        present[i].mId, present[i].ptIdx,
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
  measurements: { type: string; points: any[] }[]
): number {
  const { count } = getInheritedPoints(toolId, measurements);
  return Math.max(0, totalPointsNeeded - count);
}

/**
 * 根据检查类型获取工具列表
 */
export function getToolsForExamType(examType: string) {
  if (examType === '正位X光片') {
    return getAnteriorTools();
  } else if (examType === '侧位X光片') {
    return getLateralTools();
  } else {
    return getGenericTools();
  }
}
