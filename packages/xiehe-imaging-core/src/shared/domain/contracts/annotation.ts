import type { AvtMetadata } from './avt';
import type { ImageSize, Point } from './geometry';
import type { PelvicMeasurementMetadata } from './pelvic';

export enum AnnotationSource {
  AI = 'ai',
  MANUAL = 'manual',
}

/** image_files.annotation.measurements 中的单条测量快照。 */
export interface MeasurementData {
  id: string;
  type: string;
  originalType?: string;
  value: string;
  points: Point[];
  description?: string | null;
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
  apexVertebra?: string | null;
  avtMetadata?: AvtMetadata;
  pelvicMetadata?: PelvicMeasurementMetadata;
  keypointSynced?: boolean;
}

/**
 * 椎体角点顺序是跨端持久化契约：TL、TR、BL、BR。
 * 不允许由具体画布的显示方向重新解释该数组。
 */
export interface VertebraAnnotation {
  label: string;
  corners: [Point, Point, Point, Point];
  confidence: number;
  source: AnnotationSource;
}

/** 侧位单股骨头中心点标注。 */
export interface CfhAnnotation {
  center: Point;
  confidence: number;
  source: AnnotationSource;
}

/** api/v1/image-files/{id} 中 annotation JSON 的跨端契约。 */
export interface AnnotationData extends ImageSize {
  measurements: MeasurementData[];
  standardDistance: number;
  standardDistancePoints: Point[];
  /** v2 只保存用户显式创建的手动绑定，读取边界负责迁移历史结构。 */
  pointBindings?: unknown;
  savedAt: string;
  vertebraeLayer?: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
}
