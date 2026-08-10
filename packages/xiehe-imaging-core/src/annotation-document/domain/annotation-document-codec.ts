import type {
  AnnotationDocument,
  CreateAnnotationDocumentInput,
} from './annotation-document';
import { ANNOTATION_DOCUMENT_SCHEMA_VERSION } from './annotation-document';
import {
  AnnotationSource,
  type CfhAnnotation,
  type MeasurementData,
  type Point,
  type VertebraAnnotation,
} from '../../shared/domain/contracts';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readPoint(value: unknown): Point | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y)
  ) {
    return null;
  }
  return { x: value.x, y: value.y };
}

function readPoints(value: unknown): Point[] | null {
  if (!Array.isArray(value)) return null;
  const points = value.map(readPoint);
  return points.every((point): point is Point => point !== null)
    ? points
    : null;
}

function cloneJsonValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => cloneJsonValue(item)) as T;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)])
    ) as T;
  }
  return value;
}

function cloneMeasurement(measurement: MeasurementData): MeasurementData {
  return {
    ...measurement,
    points: measurement.points.map(point => ({ ...point })),
    ...(measurement.avtMetadata
      ? { avtMetadata: cloneJsonValue(measurement.avtMetadata) }
      : {}),
    ...(measurement.pelvicMetadata
      ? { pelvicMetadata: cloneJsonValue(measurement.pelvicMetadata) }
      : {}),
  };
}

function readMeasurement(
  value: unknown,
  index: number
): MeasurementData | null {
  if (!isRecord(value)) return null;
  const points = readPoints(value.points);
  if (typeof value.type !== 'string' || points === null) {
    return null;
  }

  // 保留未知字段是刻意的前向兼容策略：工具可以先增加自己的版本化 metadata，
  // 旧客户端读取再保存时不能把尚未认识的业务字段裁掉。
  return {
    ...value,
    // 最早期本地快照没有 id；生成稳定的文档内 id，避免整条标注丢失。
    id:
      typeof value.id === 'string' && value.id.length > 0
        ? value.id
        : `legacy-measurement-${index}`,
    type: value.type,
    value: typeof value.value === 'string' ? value.value : '',
    points,
  } as unknown as MeasurementData;
}

function readMeasurements(value: unknown): MeasurementData[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const measurement = readMeasurement(item, index);
    return measurement ? [measurement] : [];
  });
}

function cloneVertebra(annotation: VertebraAnnotation): VertebraAnnotation {
  return {
    ...annotation,
    corners: annotation.corners.map(point => ({ ...point })) as [
      Point,
      Point,
      Point,
      Point,
    ],
  };
}

function readVertebra(value: unknown): VertebraAnnotation | null {
  if (!isRecord(value) || typeof value.label !== 'string') return null;
  const corners = readPoints(value.corners);
  if (corners?.length !== 4) return null;
  return {
    label: value.label,
    corners: corners as [Point, Point, Point, Point],
    confidence: isFiniteNumber(value.confidence) ? value.confidence : 1,
    // source 是后加字段；缺失的历史检测层只能按 AI 来源恢复。
    source:
      typeof value.source === 'string'
        ? (value.source as VertebraAnnotation['source'])
        : AnnotationSource.AI,
  };
}

function readVertebraeLayer(value: unknown): VertebraAnnotation[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const annotation = readVertebra(item);
    return annotation ? [annotation] : [];
  });
}

function cloneCfh(annotation: CfhAnnotation): CfhAnnotation {
  return { ...annotation, center: { ...annotation.center } };
}

function readCfh(value: unknown): CfhAnnotation | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const center = readPoint(value.center);
  if (center === null) {
    return undefined;
  }
  return {
    center,
    confidence: isFiniteNumber(value.confidence) ? value.confidence : 1,
    source:
      typeof value.source === 'string'
        ? (value.source as CfhAnnotation['source'])
        : AnnotationSource.AI,
  };
}

function readPositiveDimension(value: unknown): number | undefined {
  return isFiniteNumber(value) && value > 0 ? value : undefined;
}

/** 从当前内存状态构建无损快照，供服务器保存与本地维护备份共同使用。 */
export function createAnnotationDocument(
  input: CreateAnnotationDocumentInput
): AnnotationDocument {
  return {
    schemaVersion: ANNOTATION_DOCUMENT_SCHEMA_VERSION,
    measurements: input.measurements.map(cloneMeasurement),
    standardDistance: input.standardDistance,
    standardDistancePoints:
      input.standardDistancePoints?.map(point => ({ ...point })) ?? null,
    ...(input.pointBindings !== undefined
      ? { pointBindings: cloneJsonValue(input.pointBindings) }
      : {}),
    ...(readPositiveDimension(input.imageWidth) !== undefined
      ? { imageWidth: input.imageWidth }
      : {}),
    ...(readPositiveDimension(input.imageHeight) !== undefined
      ? { imageHeight: input.imageHeight }
      : {}),
    ...(input.reportText !== undefined ? { reportText: input.reportText } : {}),
    ...(input.savedAt !== undefined ? { savedAt: input.savedAt } : {}),
    ...(input.vertebraeLayer !== undefined
      ? { vertebraeLayer: input.vertebraeLayer.map(cloneVertebra) }
      : {}),
    ...(input.cfhAnnotation !== undefined
      ? {
          cfhAnnotation:
            input.cfhAnnotation === null ? null : cloneCfh(input.cfhAnnotation),
        }
      : {}),
  };
}

/**
 * 将服务端或本地维护备份中的未知 JSON 解码为当前版本。
 *
 * 历史 v0 没有 schemaVersion，字段形状与 v1 基本一致，因而采用同一条
 * 归一化路径升级。未来版本不应在这里静默降级，避免旧客户端破坏新协议。
 */
export function decodeAnnotationDocument(
  value: unknown
): AnnotationDocument | null {
  if (!isRecord(value)) return null;
  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== ANNOTATION_DOCUMENT_SCHEMA_VERSION
  ) {
    return null;
  }

  const standardDistance = isFiniteNumber(value.standardDistance)
    ? value.standardDistance
    : null;
  const standardDistancePoints = readPoints(value.standardDistancePoints);
  const vertebraeLayer = readVertebraeLayer(value.vertebraeLayer);
  const cfhAnnotation = readCfh(value.cfhAnnotation);

  return createAnnotationDocument({
    measurements: readMeasurements(value.measurements),
    standardDistance,
    standardDistancePoints,
    ...(value.pointBindings !== undefined
      ? { pointBindings: value.pointBindings }
      : {}),
    imageWidth: readPositiveDimension(value.imageWidth),
    imageHeight: readPositiveDimension(value.imageHeight),
    reportText:
      typeof value.reportText === 'string' ? value.reportText : undefined,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : undefined,
    ...(vertebraeLayer !== undefined ? { vertebraeLayer } : {}),
    ...(cfhAnnotation !== undefined ? { cfhAnnotation } : {}),
  });
}
