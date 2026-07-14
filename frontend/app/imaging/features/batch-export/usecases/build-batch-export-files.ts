import { downloadImageFile, type ImageFile } from '@/services/imageServices/imageFileService';
import {
  getMeasurementRecord,
  type MeasurementRecord,
} from '@/services/imageServices/measurementService';

import {
  buildAnnotationPointRows,
  buildExportFilename,
  buildLabelMeAnnotationBlob,
  buildLabelMeAnnotationPayload,
  buildLabelMeExportPath,
  buildLabelMeImageFilename,
  buildLabelMeJsonFilename,
  buildMeasurementRows,
  buildTrainingLabelBlob,
  buildTrainingLabelFilename,
  createTabularBlob,
  type ExportContentType,
  type ExportFile,
  getAiDetectionMeasurements,
  getMeasurementsForImage,
  getParameterMeasurements,
  parseAnnotationData,
} from '../domain';
import {
  convertImageBlobToPngBlob,
  createAnnotatedImageBlob,
} from './create-annotated-image-export';

const TABULAR_EXPORT_FORMAT = 'csv' as const;
const ANNOTATED_IMAGE_FORMAT = 'png' as const;

async function getFallbackMeasurements(
  image: ImageFile,
  cache: Map<number, MeasurementRecord | null>
) {
  if (!cache.has(image.id)) {
    const record = await getMeasurementRecord(image.id).catch(() => null);
    cache.set(image.id, record);
  }

  return cache.get(image.id)?.measurements ?? [];
}

export async function buildBatchExportFiles({
  images,
  exportContent,
  onProgress,
}: {
  images: ImageFile[];
  exportContent: ExportContentType;
  onProgress?: (progress: number) => void;
}): Promise<ExportFile[]> {
  const files: ExportFile[] = [];
  const measurementRecordCache = new Map<number, MeasurementRecord | null>();
  const total = Math.max(images.length, 1);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const annotationData = parseAnnotationData(image);
    const needsMeasurements =
      exportContent === 'annotated-image' ||
      exportContent === 'annotation-points' ||
      exportContent === 'measurement-parameters';
    const measurements = needsMeasurements
      ? getMeasurementsForImage(
          image,
          await getFallbackMeasurements(image, measurementRecordCache)
        )
      : [];

    if (exportContent === 'original-image') {
      const originalImageBlob = await downloadImageFile(image.id);
      const blob = await createAnnotatedImageBlob({
        imageBlob: originalImageBlob,
        measurements: [],
        format: ANNOTATED_IMAGE_FORMAT,
      });
      files.push({
        filename: buildExportFilename(image, exportContent, ANNOTATED_IMAGE_FORMAT),
        blob,
      });
    } else if (exportContent === 'annotated-image') {
      const originalImageBlob = await downloadImageFile(image.id);
      const blob = await createAnnotatedImageBlob({
        imageBlob: originalImageBlob,
        measurements,
        annotationSize: {
          width: annotationData?.imageWidth,
          height: annotationData?.imageHeight,
        },
        format: ANNOTATED_IMAGE_FORMAT,
      });
      files.push({
        filename: buildExportFilename(image, exportContent, ANNOTATED_IMAGE_FORMAT),
        blob,
      });
    } else if (exportContent === 'annotation-points') {
      const rows = buildAnnotationPointRows(
        image,
        getAiDetectionMeasurements(measurements)
      );
      files.push({
        filename: buildExportFilename(image, exportContent, TABULAR_EXPORT_FORMAT),
        blob: createTabularBlob(rows, TABULAR_EXPORT_FORMAT, exportContent),
      });
    } else if (exportContent === 'training-data') {
      const vertebraeLayer = annotationData?.vertebraeLayer;
      if (!vertebraeLayer || vertebraeLayer.length === 0) {
        const blob = await downloadImageFile(image.id);
        files.push({
          filename: buildExportFilename(image, 'original-image', ANNOTATED_IMAGE_FORMAT),
          blob,
        });
      } else {
        const imageWidth = annotationData?.imageWidth;
        const imageHeight = annotationData?.imageHeight;
        if (imageWidth && imageHeight) {
          const imageBlob = await downloadImageFile(image.id);
          files.push({
            filename: buildExportFilename(image, 'training-data', 'original'),
            blob: imageBlob,
          });
          files.push({
            filename: buildTrainingLabelFilename(image),
            blob: buildTrainingLabelBlob(image, vertebraeLayer, imageWidth, imageHeight),
          });
        } else {
          console.warn(`影像 ${image.id} 缺少尺寸信息，跳过训练数据导出`);
        }
      }
    } else if (exportContent === 'labelme-compatible-data') {
      const imageBlob = await downloadImageFile(image.id);
      const pngImage = await convertImageBlobToPngBlob(imageBlob);
      const imageFilename = buildLabelMeImageFilename(image);
      const jsonFilename = buildLabelMeJsonFilename(image);
      const sourceSize = {
        width: annotationData?.imageWidth || pngImage.width,
        height: annotationData?.imageHeight || pngImage.height,
      };
      const targetSize = {
        width: pngImage.width,
        height: pngImage.height,
      };
      const labelMePayload = buildLabelMeAnnotationPayload({
        imagePath: imageFilename,
        vertebraeLayer: annotationData?.vertebraeLayer ?? [],
        cfhAnnotation: annotationData?.cfhAnnotation ?? null,
        sourceSize,
        targetSize,
      });

      files.push({
        filename: buildLabelMeExportPath(image, imageFilename),
        blob: pngImage.blob,
      });
      files.push({
        filename: buildLabelMeExportPath(image, jsonFilename),
        blob: buildLabelMeAnnotationBlob(labelMePayload),
      });
    } else {
      const rows = buildMeasurementRows(
        image,
        getParameterMeasurements(measurements)
      );
      files.push({
        filename: buildExportFilename(image, exportContent, TABULAR_EXPORT_FORMAT),
        blob: createTabularBlob(rows, TABULAR_EXPORT_FORMAT, exportContent),
      });
    }

    onProgress?.(Math.round(((index + 1) / total) * 85));
  }

  return files;
}
