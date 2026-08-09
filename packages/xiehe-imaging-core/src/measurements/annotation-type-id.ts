/**
 * 将工具类型转换为内部稳定 key。
 *
 * 该规则不读取工具 catalog，避免领域规则反向依赖平台工具注册表。
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
