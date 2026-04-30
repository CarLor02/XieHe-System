import type { MeasurementData } from '@/app/imaging/viewer/image-viewer/types';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@/app/imaging/viewer/image-viewer/catalog/annotation-catalog';
import type { ImageFile } from '@/services/imageServices/imageFileService';

import type { ParsedAnnotationData } from './export-types';

export function parseAnnotationData(image: ImageFile): ParsedAnnotationData | null {
  if (!image.annotation) {
    return null;
  }

  try {
    const parsed = JSON.parse(image.annotation);
    if (!parsed || !Array.isArray(parsed.measurements)) {
      return null;
    }

    return {
      measurements: parsed.measurements,
      imageWidth: Number(parsed.imageWidth) || undefined,
      imageHeight: Number(parsed.imageHeight) || undefined,
    };
  } catch (error) {
    console.warn('解析影像标注数据失败:', error);
    return null;
  }
}

export function getMeasurementsForImage(
  image: ImageFile,
  fallbackMeasurements: MeasurementData[] = []
): MeasurementData[] {
  const annotation = parseAnnotationData(image);
  return annotation?.measurements ?? fallbackMeasurements;
}

export function isAiDetectionMeasurement(measurement: MeasurementData): boolean {
  const ids = [
    measurement.id,
    measurement.type,
    measurement.originalType,
  ].filter(Boolean);

  return ids.some(value => {
    const text = String(value);
    const normalized = text.trim().toLowerCase();
    return normalized.startsWith('ai-detection') || text.startsWith('AI检测-');
  });
}

export function getAiDetectionMeasurements(
  measurements: MeasurementData[]
): MeasurementData[] {
  return measurements.filter(isAiDetectionMeasurement);
}

export function isParameterMeasurement(measurement: MeasurementData): boolean {
  if (isAiDetectionMeasurement(measurement)) {
    return false;
  }

  const typeId = getAnnotationTypeId(measurement.type);
  if (typeId.startsWith('aux-')) {
    return false;
  }

  const config = getAnnotationConfig(typeId);
  return config?.category === 'measurement';
}

export function getParameterMeasurements(
  measurements: MeasurementData[]
): MeasurementData[] {
  return measurements.filter(isParameterMeasurement);
}
