import type { MeasurementData, VertebraAnnotation } from '@/app/imaging/features/image-viewer/public';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/public';
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
      vertebraeLayer: Array.isArray(parsed.vertebraeLayer) ? parsed.vertebraeLayer : undefined,
    };
  } catch (error) {
    console.warn('解析影像标注数据失败:', error);
    return null;
  }
}

/**
 * 构建训练数据 label JSON Blob。
 * 坐标归一化到 [0, 1]（除以图像宽/高）。
 * POSE 标签（IR/IL/SR/SL/CR/CL）corners 四值相同，输出单点。
 */
const POSE_LABELS = new Set(['CR', 'CL', 'IR', 'IL', 'SR', 'SL']);

export function buildTrainingLabelBlob(
  image: ImageFile,
  vertebraeLayer: VertebraAnnotation[],
  imageWidth: number,
  imageHeight: number,
): Blob {
  const vertebrae = vertebraeLayer.map(v => {
    if (POSE_LABELS.has(v.label)) {
      // 单点
      const pt = v.corners[0];
      return {
        label: v.label,
        type: 'point',
        point: {
          x: pt.x / imageWidth,
          y: pt.y / imageHeight,
        },
      };
    }
    // 椎体四角
    return {
      label: v.label,
      type: 'vertebra',
      corners: v.corners.map(pt => ({
        x: pt.x / imageWidth,
        y: pt.y / imageHeight,
      })),
    };
  });

  const payload = {
    imageId: image.id,
    originalFilename: image.original_filename || '',
    imageWidth,
    imageHeight,
    vertebrae,
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
