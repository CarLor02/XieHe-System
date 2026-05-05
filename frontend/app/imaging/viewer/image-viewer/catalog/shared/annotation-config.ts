import { AP_MEASUREMENT_CONFIGS } from '../ap/measurements';
import { AUXILIARY_CONFIGS } from '../auxiliary';
import { LATERAL_MEASUREMENT_CONFIGS } from '../lateral/measurements';
import {
  type AnnotationConfig,
  normalizeAnnotationLookupKey,
} from './annotation-config-utils';

export * from './annotation-config-utils';

export const ANNOTATION_CONFIGS: Record<string, AnnotationConfig> = {
  ...AP_MEASUREMENT_CONFIGS,
  ...LATERAL_MEASUREMENT_CONFIGS,
  ...AUXILIARY_CONFIGS,
};

/**
 * 根据标注类型ID获取配置
 */
export function getAnnotationConfig(
  typeId: string
): AnnotationConfig | undefined {
  // 内部只接受英文工具 key；中文只作为 UI 展示文案，不作为查找别名。
  const normalizedId = normalizeAnnotationLookupKey(typeId);
  return ANNOTATION_CONFIGS[normalizedId];
}

export function getAnnotationTypeId(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  if (/^Cobb\d+$/i.test(typeId)) {
    return typeId.toLowerCase();
  }

  return (
    getAnnotationConfig(typeId)?.id || normalizeAnnotationLookupKey(typeId)
  );
}

export function getAnnotationDisplayName(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  return getAnnotationConfig(typeId)?.name || typeId;
}

/**
 * 获取所有测量类标注
 */
export function getMeasurementConfigs(): AnnotationConfig[] {
  return Object.values(ANNOTATION_CONFIGS).filter(
    config => config.category === 'measurement'
  );
}

/**
 * 获取所有辅助标注
 */
export function getAuxiliaryConfigs(): AnnotationConfig[] {
  return Object.values(ANNOTATION_CONFIGS).filter(
    config => config.category === 'auxiliary'
  );
}
