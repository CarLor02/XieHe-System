import { CL_CONFIG } from './cl';
import type { AnnotationConfig } from '@xiehe/imaging-catalog/annotations/types';

export const LATERAL_COBB_CONFIG: AnnotationConfig = {
  ...CL_CONFIG,
  id: 'lateral-cobb',
  name: 'Cobb',
  icon: 'medical-cobb',
  description: '任意两节段Cobb角测量',
};
