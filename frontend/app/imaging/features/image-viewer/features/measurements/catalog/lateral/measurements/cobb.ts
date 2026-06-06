import { COBB_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements/cobb';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const LATERAL_COBB_CONFIG: AnnotationConfig = {
  ...COBB_CONFIG,
  id: 'cobb',
  name: 'Cobb',
  description: '任意两节段Cobb角测量',
};
