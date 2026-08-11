import {
  type AnnotationBindings,
  validateAnnotationBindings,
} from '../../bindings/domain';
import type {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '../../shared/domain/contracts';
import type { AnnotationDocument } from '../domain/annotation-document';
import { createAnnotationDocument } from '../domain/annotation-document-codec';

export interface AnnotationSavePlan {
  document: AnnotationDocument;
  hasSavedAnnotationContent: boolean;
  successMessage: string;
}

/** 保存端口调用前的唯一快照构建入口，不包含网络或本地存储行为。 */
export function prepareAnnotationSave(input: {
  imageNaturalSize: ImageSize | null;
  standardDistance: number | null;
  standardDistancePoints: readonly Point[] | null;
  pointBindings: AnnotationBindings;
  measurements: readonly MeasurementData[];
  reportText: string;
  vertebraeLayer?: readonly VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  savedAt: string;
}): AnnotationSavePlan {
  const vertebraeLayer = input.vertebraeLayer ?? [];
  const cfhAnnotation = input.cfhAnnotation ?? null;
  const hasStandardDistance =
    input.standardDistance !== null &&
    input.standardDistancePoints?.length === 2;
  const hasKeypointLayer = vertebraeLayer.length > 0 || cfhAnnotation !== null;
  const hasSavedAnnotationContent =
    input.measurements.length > 0 || hasKeypointLayer || hasStandardDistance;
  const pointBindings = validateAnnotationBindings(
    input.pointBindings,
    input.measurements
  );
  const document = createAnnotationDocument({
    imageWidth: input.imageNaturalSize?.width,
    imageHeight: input.imageNaturalSize?.height,
    measurements: input.measurements,
    standardDistance: input.standardDistance,
    standardDistancePoints: input.standardDistancePoints,
    pointBindings,
    reportText: input.reportText,
    savedAt: input.savedAt,
    vertebraeLayer: vertebraeLayer.length > 0 ? vertebraeLayer : undefined,
    cfhAnnotation,
  });

  return {
    document,
    hasSavedAnnotationContent,
    successMessage:
      input.measurements.length > 0
        ? '标注已保存到服务器'
        : hasSavedAnnotationContent
          ? '关键点已保存到服务器'
          : '空标注已保存到服务器',
  };
}
