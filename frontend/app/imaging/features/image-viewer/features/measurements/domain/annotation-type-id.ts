/**
 * 将工具类型转换为内部稳定 key。
 *
 * 这里不读取 catalog，避免领域规则反向依赖工具注册表。中文名称只用于展示，
 * 不在此处作为别名参与匹配。
 */
export function normalizeAnnotationLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getAnnotationTypeId(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  if (/^(lateral-)?Cobb\d+$/i.test(typeId)) {
    return typeId.toLowerCase();
  }

  return normalizeAnnotationLookupKey(typeId);
}
