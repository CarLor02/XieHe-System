import { AP_MEASUREMENT_CONFIGS } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements';
import { AUXILIARY_CONFIGS } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary';
import { LATERAL_MEASUREMENT_CONFIGS } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements';
import {
  type AnnotationConfig,
  normalizeAnnotationLookupKey,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export * from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const ANNOTATION_CONFIGS: Record<string, AnnotationConfig> = {
  ...AP_MEASUREMENT_CONFIGS,
  ...LATERAL_MEASUREMENT_CONFIGS,
  ...AUXILIARY_CONFIGS,
};

function getNumberedCobbConfig(
  normalizedId: string
): AnnotationConfig | undefined {
  const match = normalizedId.match(/^(lateral-)?cobb(\d+)$/i);
  if (!match) return undefined;

  const cobbConfig = match[1]
    ? ANNOTATION_CONFIGS['lateral-cobb']
    : ANNOTATION_CONFIGS.cobb;
  if (!cobbConfig) return undefined;

  return {
    ...cobbConfig,
    id: normalizedId,
    name: `Cobb${match[2]}`,
    description: `Cobb角${match[2]}测量`,
  };
}

/**
 * 根据标注类型ID获取配置
 */
export function getAnnotationConfig(
  typeId: string
): AnnotationConfig | undefined {
  // 内部只接受英文工具 key；中文只作为 UI 展示文案，不作为查找别名。
  const normalizedId = normalizeAnnotationLookupKey(typeId);
  return ANNOTATION_CONFIGS[normalizedId] ?? getNumberedCobbConfig(normalizedId);
}

export function getAnnotationTypeId(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  if (/^(lateral-)?Cobb\d+$/i.test(typeId)) {
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
