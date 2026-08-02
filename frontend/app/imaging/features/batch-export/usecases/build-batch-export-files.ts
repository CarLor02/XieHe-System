import {
  downloadImageFile,
  type ImageAnnotationJson,
  type ImageFile,
} from '@/services/imageServices/imageFileService';

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
import { createLogger } from '@/lib/logger';

const logger = createLogger('app.imaging.features.batch.export.usecases.build.batch.export.files');

const TABULAR_EXPORT_FORMAT = 'csv' as const;
const ANNOTATED_IMAGE_FORMAT = 'png' as const;

export type ExportImageFile = ImageFile & {
  annotation: ImageAnnotationJson | null;
};

export async function buildBatchExportFiles({
  images,
  exportContent,
  onProgress,
}: {
  images: ExportImageFile[];
  exportContent: ExportContentType;
  onProgress?: (progress: number) => void;
}): Promise<ExportFile[]> {
  const files: ExportFile[] = [];
  const total = Math.max(images.length, 1);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const annotationData = parseAnnotationData(image);
    const needsMeasurements =
      exportContent === 'annotated-image' ||
      exportContent === 'annotation-points' ||
      exportContent === 'measurement-parameters';
    const measurements = needsMeasurements ? getMeasurementsForImage(image) : [];

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
          logger.warn(`影像 ${image.id} 缺少尺寸信息，跳过训练数据导出`);
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
