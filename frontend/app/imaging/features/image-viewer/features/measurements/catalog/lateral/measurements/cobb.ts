import { CL_CONFIG } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements/cl';
import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';

export const LATERAL_COBB_CONFIG: AnnotationConfig = {
  ...CL_CONFIG,
  id: 'lateral-cobb',
  name: 'Cobb',
  icon: 'medical-cobb',
  description: '任意两节段Cobb角测量',
};
