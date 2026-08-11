import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '../../shared/domain/contracts';
import {
  type KeypointAnnotation,
  vertebraeLayerToKeypoints,
} from '../../keypoints/domain';
import {
  getAnnotationTypeId,
  getToolCapability,
} from '../../measurements/domain';

export interface AnnotationExportImage {
  id: number;
  original_filename?: string | null;
  annotation: Record<string, unknown> | null;
}

export interface ParsedAnnotationData {
  measurements: MeasurementData[];
  imageWidth?: number;
  imageHeight?: number;
  vertebraeLayer?: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
}

export function parseAnnotationData(
  image: AnnotationExportImage
): ParsedAnnotationData | null {
  if (!image.annotation) return null;
  const parsed = image.annotation;
  return {
    measurements: Array.isArray(parsed.measurements)
      ? (parsed.measurements as MeasurementData[])
      : [],
    imageWidth: Number(parsed.imageWidth) || undefined,
    imageHeight: Number(parsed.imageHeight) || undefined,
    vertebraeLayer: Array.isArray(parsed.vertebraeLayer)
      ? (parsed.vertebraeLayer as VertebraAnnotation[])
      : undefined,
    cfhAnnotation: parsed.cfhAnnotation
      ? (parsed.cfhAnnotation as CfhAnnotation)
      : undefined,
  };
}

const POSE_LABELS = new Set(['CR', 'CL', 'IR', 'IL', 'SR', 'SL']);

export function buildTrainingLabelPayload(
  image: Pick<AnnotationExportImage, 'id' | 'original_filename'>,
  vertebraeLayer: VertebraAnnotation[],
  imageWidth: number,
  imageHeight: number
) {
  return {
    imageId: image.id,
    originalFilename: image.original_filename || '',
    imageWidth,
    imageHeight,
    vertebrae: vertebraeLayer.map(annotation => {
      if (POSE_LABELS.has(annotation.label)) {
        const point = annotation.corners[0];
        return {
          label: annotation.label,
          type: 'point' as const,
          source: annotation.source,
          point: { x: point.x / imageWidth, y: point.y / imageHeight },
        };
      }
      return {
        label: annotation.label,
        type: 'vertebra' as const,
        source: annotation.source,
        corners: annotation.corners.map(point => ({
          x: point.x / imageWidth,
          y: point.y / imageHeight,
        })),
      };
    }),
  };
}

export function getMeasurementsForImage(
  image: AnnotationExportImage
): MeasurementData[] {
  return parseAnnotationData(image)?.measurements ?? [];
}

export function isAiDetectionMeasurement(
  measurement: MeasurementData
): boolean {
  return [measurement.id, measurement.type, measurement.originalType]
    .filter(Boolean)
    .some(value => {
      const text = String(value);
      return (
        text.trim().toLowerCase().startsWith('ai-detection') ||
        text.startsWith('AI检测-')
      );
    });
}

export function isParameterMeasurement(measurement: MeasurementData): boolean {
  if (isAiDetectionMeasurement(measurement)) return false;
  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId.startsWith('aux-')) return false;
  if (/^(lateral-)?cobb\d+$/i.test(typeId)) return true;
  return getToolCapability(typeId)?.annotationCategory === 'measurement';
}

export function getParameterMeasurements(
  measurements: MeasurementData[]
): MeasurementData[] {
  return measurements.filter(isParameterMeasurement);
}

export function getDetectionLayerKeypoints(input: {
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  examType: string;
}): KeypointAnnotation[] {
  return vertebraeLayerToKeypoints(
    input.vertebraeLayer,
    input.examType,
    input.cfhAnnotation ?? null
  );
}
