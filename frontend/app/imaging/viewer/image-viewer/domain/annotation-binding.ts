/**
 * 标注点绑定配置
 *
 * 侧位X光片中，L1-S1、L4-S1、PI、PT、SS 测量共享 S1 上缘的两个端点。
 * 本模块实现点绑定功能：绑定后移动其中一个标注的共享点，其他标注的对应点自动同步。
 *
 * 绑定规则（S1 上缘）：
 *  直接绑定（same position）：
 *    S1左点  ->  {SS, 0}  {LL L1-S1, 2}  {LL L4-S1, 2}  {PI, 1}  {PT, 1}  {TPA, 5}
 *    S1右点  ->  {SS, 1}  {LL L1-S1, 3}  {LL L4-S1, 3}  {PI, 2}  {PT, 2}  {TPA, 6}
 */

// ==================== 类型定义 ====================

/** 单个点的引用 */
export interface PointRef {
  annotationId: string;
  pointIndex: number;
}

/**
 * 同步点组：组内所有成员共享同一图像坐标。
 * 移动其中任意成员时，其余成员自动跟随。
 */
export interface PointSyncGroup {
  id: string;
  name: string;
  /** 视觉指示圆圈颜色 */
  color: string;
  members: PointRef[];
}

/** 完整的绑定配置 */
export interface AnnotationBindings {
  syncGroups: PointSyncGroup[];
}

// ==================== 静态映射 ====================

/**
 * 各标注类型的 S1 上缘点映射：
 *   left  = S1上缘左端点在 points[] 中的索引（null 表示无）
 *   right = S1上缘右端点在 points[] 中的索引（null 表示无）
 */
export const S1_BINDING_POINT_MAP: Record<
  string,
  { left: number | null; right: number | null }
> = {
  'SS':       { left: 0, right: 1 },  // SS 骶骨倾斜角：points[0],points[1] = S1上缘两端
  'LL L1-S1': { left: 2, right: 3 },  // LL L1-S1：points[2],points[3] = S1上缘
  'LL L4-S1': { left: 2, right: 3 },  // LL L4-S1：points[2],points[3] = S1上缘
  'PI':       { left: 1, right: 2 },  // PI：points[1],points[2] = S1上缘左右端点
  'PT':       { left: 1, right: 2 },  // PT：points[1],points[2] = S1上缘左右端点
  'TPA':      { left: 5, right: 6 },  // TPA：points[5],points[6] = S1上缘左右端点
};

// ==================== 工厂函数 ====================

/** 创建空绑定配置 */
export function createEmptyBindings(): AnnotationBindings {
  return { syncGroups: [] };
}

/**
 * 根据当前标注列表自动创建 S1 上缘绑定。
 * 只对存在于当前列表中的标注生成绑定条目。
 */
export function autoCreateS1Bindings(
  measurements: Array<{ id: string; type: string; points: Array<{ x: number; y: number }> }>
): AnnotationBindings {
  const leftMembers: PointRef[] = [];
  const rightMembers: PointRef[] = [];

  for (const m of measurements) {
    const mapping = S1_BINDING_POINT_MAP[m.type];
    if (!mapping) continue;

    if (mapping.left !== null && m.points.length > mapping.left) {
      leftMembers.push({ annotationId: m.id, pointIndex: mapping.left });
    }
    if (mapping.right !== null && m.points.length > mapping.right) {
      rightMembers.push({ annotationId: m.id, pointIndex: mapping.right });
    }
  }

  if (leftMembers.length === 0 && rightMembers.length === 0) {
    return createEmptyBindings();
  }

  const syncGroups: PointSyncGroup[] = [];

  if (leftMembers.length > 0) {
    syncGroups.push({
      id: 'S1-left',
      name: 'S1上缘-左端点',
      color: '#f59e0b',
      members: leftMembers,
    });
  }

  if (rightMembers.length > 0) {
    syncGroups.push({
      id: 'S1-right',
      name: 'S1上缘-右端点',
      color: '#f59e0b',
      members: rightMembers,
    });
  }

  return { syncGroups };
}

// ==================== 查询辅助 ====================

/** 返回包含该点的所有同步组 */
export function getSyncGroupsForPoint(
  annotationId: string,
  pointIndex: number,
  bindings: AnnotationBindings
): PointSyncGroup[] {
  return bindings.syncGroups.filter(g =>
    g.members.some(m => m.annotationId === annotationId && m.pointIndex === pointIndex)
  );
}

/**
 * 获取该点在绑定中使用的视觉指示颜色。
 * - 直接绑定成员：返回所在组颜色（黄色系）
 * - 中点绑定目标：返回紫色
 * - 无绑定：返回 null
 */
export function getBindingIndicatorColor(
  annotationId: string,
  pointIndex: number,
  bindings: AnnotationBindings
): string | null {
  const groups = getSyncGroupsForPoint(annotationId, pointIndex, bindings);
  if (groups.length > 0) return groups[0].color;
  return null;
}

/** 检查指定标注是否有任何点参与绑定 */
export function isMeasurementBound(
  annotationId: string,
  bindings: AnnotationBindings
): boolean {
  return bindings.syncGroups.some(g =>
    g.members.some(m => m.annotationId === annotationId)
  );
}

/** 统计绑定组内涉及的标注 ID 列表 */
export function listBoundAnnotationIds(bindings: AnnotationBindings): string[] {
  const ids = new Set<string>();
  for (const group of bindings.syncGroups) {
    for (const m of group.members) ids.add(m.annotationId);
  }
  return Array.from(ids);
}

// ==================== 核心传播函数 ====================

export type MeasurementLike = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
};

/**
 * 当某个点被移动时，应用全部绑定规则并返回更新后的标注数组。
 *
 * @param measurements     当前所有标注
 * @param movedAnnotationId 被移动点所属标注的 ID
 * @param movedPointIndex  被移动点在 points[] 中的索引
 * @param newX             新的图像坐标 X
 * @param newY             新的图像坐标 Y
 * @param bindings         当前绑定配置
 * @returns 更新后的标注数组（points 已被同步，但 value 需要调用方自行重算）
 */
export function applyPointBindings<T extends MeasurementLike>(
  measurements: T[],
  movedAnnotationId: string,
  movedPointIndex: number,
  newX: number,
  newY: number,
  bindings: AnnotationBindings
): T[] {
  // 无绑定配置时快速返回
  if (bindings.syncGroups.length === 0) {
    return measurements;
  }

  // 深拷贝 points 数组（浅拷贝对象即可，points 索引替换方式安全）
  const updated: T[] = measurements.map(m => ({
    ...m,
    points: m.points.map(p => ({ ...p })),
  }));

  // 同步组传播：将组内其他成员更新到新坐标
  for (const group of bindings.syncGroups) {
    const inGroup = group.members.some(
      m => m.annotationId === movedAnnotationId && m.pointIndex === movedPointIndex
    );
    if (!inGroup) continue;

    // 同步组内其他所有成员到新坐标
    for (const member of group.members) {
      if (
        member.annotationId === movedAnnotationId &&
        member.pointIndex === movedPointIndex
      ) {
        continue; // 移动点本身已由外部设置
      }
      const target = updated.find(m => m.id === member.annotationId);
      if (target && member.pointIndex < target.points.length) {
        target.points[member.pointIndex] = { x: newX, y: newY };
      }
    }
  }

  return updated;
}

/**
 * 清除绑定中已不存在的标注（标注被删除后调用，清理悬空引用）
 */
export function cleanupBindings(
  bindings: AnnotationBindings,
  existingIds: Set<string>
): AnnotationBindings {
  const syncGroups = bindings.syncGroups
    .map(g => ({
      ...g,
      members: g.members.filter(m => existingIds.has(m.annotationId)),
    }))
    .filter(g => g.members.length > 0);

  return { syncGroups };
}

// ==================== 基于位置的自动绑定 ====================

/**
 * 容差：同一位置判断点的像素距离阈值
 */
const POSITION_TOLERANCE = 0;

/**
 * 扫描所有标注的所有点，将坐标重合（距离 ≤ tolerance）的跨标注点自动组建同步组。
 * 常用于 AI 返回结果后识别共享点并自动绑定。
 *
 * @param measurements 当前标注列表
 * @param tolerance    重合判断的像素距离阈值（默认 2）
 */
export function autoCreatePositionBindings(
  measurements: Array<{ id: string; type: string; points: Array<{ x: number; y: number }> }>,
  tolerance: number = POSITION_TOLERANCE
): AnnotationBindings {
  // 收集所有点（附带坐标信息）
  const allPoints: Array<PointRef & { x: number; y: number }> = [];
  for (const m of measurements) {
    for (let i = 0; i < m.points.length; i++) {
      allPoints.push({
        annotationId: m.id,
        pointIndex: i,
        x: m.points[i].x,
        y: m.points[i].y,
      });
    }
  }

  const visited = new Set<string>();
  const groups: PointSyncGroup[] = [];
  let groupCounter = 0;

  for (let i = 0; i < allPoints.length; i++) {
    const keyI = `${allPoints[i].annotationId}:${allPoints[i].pointIndex}`;
    if (visited.has(keyI)) continue;

    const members: PointRef[] = [
      { annotationId: allPoints[i].annotationId, pointIndex: allPoints[i].pointIndex },
    ];
    visited.add(keyI);

    for (let j = i + 1; j < allPoints.length; j++) {
      const keyJ = `${allPoints[j].annotationId}:${allPoints[j].pointIndex}`;
      if (visited.has(keyJ)) continue;
      // 同一标注内的点不绑定
      if (allPoints[j].annotationId === allPoints[i].annotationId) continue;

      const dx = allPoints[j].x - allPoints[i].x;
      const dy = allPoints[j].y - allPoints[i].y;
      if (Math.sqrt(dx * dx + dy * dy) <= tolerance) {
        members.push({
          annotationId: allPoints[j].annotationId,
          pointIndex: allPoints[j].pointIndex,
        });
        visited.add(keyJ);
      }
    }

    if (members.length > 1) {
      groupCounter++;
      groups.push({
        id: `pos-${groupCounter}`,
        name: `共享点-${groupCounter}`,
        color: '#f59e0b',
        members,
      });
    }
  }

  return { syncGroups: groups };
}

/**
 * 合并两个绑定配置，势重a（保留a中已命名的组）并压制重复对。
 * 对于 b 中的每个同步组，只有当其成员对 (pairset) 完全不被 a 中任一组覆盖时，才并入。
 */
export function mergeBindings(
  a: AnnotationBindings,
  b: AnnotationBindings
): AnnotationBindings {
  // 构建 a 中已存在的成员对集合， key = 小 ID:index大 ID:index排序
  const existingPairs = new Set<string>();
  for (const g of a.syncGroups) {
    for (let i = 0; i < g.members.length; i++) {
      for (let j = i + 1; j < g.members.length; j++) {
        const keyA = `${g.members[i].annotationId}:${g.members[i].pointIndex}`;
        const keyB = `${g.members[j].annotationId}:${g.members[j].pointIndex}`;
        existingPairs.add([keyA, keyB].sort().join('|'));
      }
    }
  }

  // 筛选 b 中尚未被覆盖的组
  const newGroups: PointSyncGroup[] = [];
  for (const g of b.syncGroups) {
    // 检查该组里是否存在至少一对未被 a 覆盖的成员对
    let hasNewPair = false;
    outer: for (let i = 0; i < g.members.length; i++) {
      for (let j = i + 1; j < g.members.length; j++) {
        const keyA = `${g.members[i].annotationId}:${g.members[i].pointIndex}`;
        const keyB = `${g.members[j].annotationId}:${g.members[j].pointIndex}`;
        if (!existingPairs.has([keyA, keyB].sort().join('|'))) {
          hasNewPair = true;
          break outer;
        }
      }
    }
    if (hasNewPair) {
      newGroups.push(g);
    }
  }

  return { syncGroups: [...a.syncGroups, ...newGroups] };
}
