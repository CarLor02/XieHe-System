/**
 * 将工具类型转换为内部稳定 key。
 *
 * 该规则不读取工具 catalog，避免领域规则反向依赖平台工具注册表。
 */
export function normalizeAnnotationLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * 历史数据和 AI 派生结果曾使用展示名或旧工具名作为 type。
 * 跨端领域逻辑必须在不依赖 Web catalog 的情况下得到同一稳定 ID。
 */
const ANNOTATION_TYPE_ALIASES: Readonly<Record<string, string>> = {
  pelvic: 'po',
  sacral: 'css',
  'c2-c7-cl': 'cl',
  'cobb-thoracic': 'cobb',
  'cobb-lumbar': 'cobb',
  'cobb-thoracolumbar': 'cobb',
  'cobb-auto1': 'cobb',
  'cobb-auto2': 'cobb',
  'cobb-auto3': 'cobb',
};

export function getAnnotationTypeId(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  if (/^(lateral-)?Cobb\d+$/i.test(typeId)) {
    return typeId.toLowerCase();
  }

  const normalizedTypeId = normalizeAnnotationLookupKey(typeId);
  return ANNOTATION_TYPE_ALIASES[normalizedTypeId] ?? normalizedTypeId;
}
