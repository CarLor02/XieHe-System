import type {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '../../shared/domain/contracts';

export const ANNOTATION_DOCUMENT_SCHEMA_VERSION = 1 as const;

/**
 * 跨 Web、移动端与服务端持久化的标注文档。
 *
 * schemaVersion 缺失的历史 JSON 由读取边界按 v0 迁移；版本字段只描述整个
 * 快照协议，各工具自身的 avtMetadata/pelvicMetadata 仍维护独立版本。
 */
export interface AnnotationDocument {
  schemaVersion: typeof ANNOTATION_DOCUMENT_SCHEMA_VERSION;
  measurements: MeasurementData[];
  standardDistance: number | null;
  standardDistancePoints: Point[] | null;
  /** v2 只保存用户显式创建的手动绑定，具体升级由 bindings 领域负责。 */
  pointBindings?: unknown;
  imageWidth?: number;
  imageHeight?: number;
  reportText?: string;
  savedAt?: string;
  vertebraeLayer?: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
}

export interface CreateAnnotationDocumentInput {
  measurements: readonly MeasurementData[];
  standardDistance: number | null;
  standardDistancePoints: readonly Point[] | null;
  pointBindings?: unknown;
  imageWidth?: number;
  imageHeight?: number;
  reportText?: string;
  savedAt?: string;
  vertebraeLayer?: readonly VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
}

/** 兼容旧调用方使用的协议名；新代码应优先使用 AnnotationDocument。 */
export type AnnotationData = AnnotationDocument;
