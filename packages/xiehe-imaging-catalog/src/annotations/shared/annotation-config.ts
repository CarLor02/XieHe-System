import { AP_MEASUREMENT_CONFIGS } from '../ap/measurements';
import { AUXILIARY_CONFIGS } from '../auxiliary';
import { LATERAL_MEASUREMENT_CONFIGS } from '../lateral/measurements';
import type { AnnotationConfig } from './annotation-config-types';
import {
  getAnnotationTypeId as getDomainAnnotationTypeId,
  normalizeAnnotationLookupKey,
} from '@xiehe/imaging-core/measurements';
import {
  getLocalizedToolCopy,
  getToolDescription,
  getToolDisplayName,
} from '../../tools';

const SHARED_ANNOTATION_CONFIGS: Record<string, AnnotationConfig> = {
  ...AP_MEASUREMENT_CONFIGS,
  ...LATERAL_MEASUREMENT_CONFIGS,
  ...AUXILIARY_CONFIGS,
};

/** 跨端 catalog 保留视觉语义和交互策略，具体 renderer 由平台层注册。 */
export const ANNOTATION_CONFIGS: Record<string, AnnotationConfig> =
  Object.fromEntries(
    Object.entries(SHARED_ANNOTATION_CONFIGS).map(([lookupKey, config]) => {
      const copy = getLocalizedToolCopy(config.id);
      return [
        lookupKey,
        copy
          ? {
              ...config,
              name: copy.name,
              description: copy.description,
              pointsNeeded: copy.capability.pointsNeeded,
              category: copy.capability.annotationCategory,
            }
          : config,
      ];
    })
  );

function getNumberedCobbConfig(
  normalizedId: string
): AnnotationConfig | undefined {
  const match = normalizedId.match(/^(lateral-)?cobb(\d+)$/i);
  if (!match) return undefined;

  const cobbConfig = match[1]
    ? ANNOTATION_CONFIGS['lateral-cobb']
    : ANNOTATION_CONFIGS.cobb;
  if (!cobbConfig) return undefined;

  const copy = getLocalizedToolCopy(normalizedId);
  return {
    ...cobbConfig,
    id: normalizedId,
    name: copy?.name ?? `Cobb${match[2]}`,
    description: copy?.description ?? `Cobb角${match[2]}测量`,
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
  return (
    ANNOTATION_CONFIGS[normalizedId] ?? getNumberedCobbConfig(normalizedId)
  );
}

export function getAnnotationTypeId(typeId: string): string {
  const normalizedTypeId = getDomainAnnotationTypeId(typeId);
  return getAnnotationConfig(normalizedTypeId)?.id || normalizedTypeId;
}

export function getAnnotationDisplayName(typeId: string): string {
  if (typeId.startsWith('AI检测-')) {
    return typeId;
  }

  return getToolDisplayName(typeId);
}

export { getToolDescription as getSharedToolDescription };

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
