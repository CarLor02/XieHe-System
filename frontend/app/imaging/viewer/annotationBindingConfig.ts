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
