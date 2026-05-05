import type {
  MeasurementData,
  PersistedKeypointAnnotation,
} from '@/app/imaging/viewer/image-viewer/types';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@/app/imaging/viewer/image-viewer/catalog/shared/annotation-config';
import type { ImageFile } from '@/services/imageServices/imageFileService';

import type { ParsedAnnotationData } from './export-types';

export function parseAnnotationData(image: ImageFile): ParsedAnnotationData | null {
  if (!image.annotation) {
    return null;
  }

  try {
    const parsed = JSON.parse(image.annotation);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (parsed.version === 2 && parsed.schema === 'keypoints-only') {
      return {
        measurements: Array.isArray(parsed.auxiliaryAnnotations)
          ? parsed.auxiliaryAnnotations
          : [],
        keypoints: Array.isArray(parsed.keypoints) ? parsed.keypoints : [],
        imageWidth: Number(parsed.imageWidth) || undefined,
        imageHeight: Number(parsed.imageHeight) || undefined,
      };
    }
    return null;
  } catch (error) {
    console.warn('解析影像标注数据失败:', error);
    return null;
  }
}

/**
 * 构建训练数据 label JSON Blob。
 * 坐标归一化到 [0, 1]（除以图像宽/高）。
 */
export function buildTrainingLabelBlob(
  image: ImageFile,
  keypoints: PersistedKeypointAnnotation[],
  imageWidth: number,
  imageHeight: number,
): Blob {
  const vertebraGroups = new Map<string, PersistedKeypointAnnotation[]>();
  const points: Array<{
    label: string;
    type: 'point';
    point: { x: number; y: number };
  }> = [];

  keypoints.forEach(keypoint => {
    const match = /^(C2|C7|T\d{1,2}|L\d)-([1-4])$/.exec(keypoint.id);
    if (match) {
      const group = match[1];
      const list = vertebraGroups.get(group) ?? [];
      list.push(keypoint);
      vertebraGroups.set(group, list);
      return;
    }

    points.push({
      label: keypoint.id,
      type: 'point',
      point: {
        x: keypoint.point.x / imageWidth,
        y: keypoint.point.y / imageHeight,
      },
    });
  });

  const vertebrae = Array.from(vertebraGroups.entries()).flatMap(
    ([label, groupKeypoints]) => {
      if (groupKeypoints.length !== 4) return [];
      const ordered = [...groupKeypoints].sort((left, right) =>
        left.id.localeCompare(right.id)
      );
    return {
      label,
      type: 'vertebra',
      corners: ordered.map(keypoint => ({
        x: keypoint.point.x / imageWidth,
        y: keypoint.point.y / imageHeight,
      })),
    };
    }
  );

  const payload = {
    imageId: image.id,
    originalFilename: image.original_filename || '',
    imageWidth,
    imageHeight,
    vertebrae: [...vertebrae, ...points],
  };

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
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
