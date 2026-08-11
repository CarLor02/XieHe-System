import type { MeasurementData } from '../../shared/domain/contracts';
import {
  buildAnnotationPointRows,
  buildMeasurementRows,
  serializeTabularRows,
} from '../domain/tabular-export';
import {
  buildExportFilename,
  buildLabelMeExportPath,
  buildLabelMeImageFilename,
  buildLabelMeJsonFilename,
  buildTrainingLabelFilename,
  type ExportContentType,
} from '../domain/export-filenames';
import {
  buildTrainingLabelPayload,
  getDetectionLayerKeypoints,
  getParameterMeasurements,
  parseAnnotationData,
  type AnnotationExportImage,
} from '../domain/annotation-export';
import { buildLabelMeAnnotationPayload } from '../domain/labelme';

export interface BatchExportImage extends AnnotationExportImage {
  patient_id?: number | null;
  patient_identifier?: string | null;
  description?: string | null;
  created_at?: string | null;
}

export interface ExportArtifact<TBinary> {
  filename: string;
  data: TBinary;
}

export interface BatchExportPorts<TBinary> {
  downloadOriginal(image: BatchExportImage): Promise<TBinary>;
  renderImage(input: {
    source: TBinary;
    measurements: readonly MeasurementData[];
    annotationSize?: { width?: number; height?: number };
  }): Promise<TBinary>;
  convertToPng(
    source: TBinary
  ): Promise<{ data: TBinary; width: number; height: number }>;
  encodeJson(value: unknown): TBinary;
  encodeText(input: {
    content: string;
    mimeType: string;
    prependBom: boolean;
  }): TBinary;
  warn?(message: string): void;
}

/** 跨平台批量导出编排；二进制、图片渲染和下载由平台端口负责。 */
export async function runBatchExport<TBinary>(input: {
  images: readonly BatchExportImage[];
  exportContent: ExportContentType;
  ports: BatchExportPorts<TBinary>;
  onProgress?: (progress: number) => void;
}): Promise<ExportArtifact<TBinary>[]> {
  const files: ExportArtifact<TBinary>[] = [];
  const total = Math.max(input.images.length, 1);

  for (let index = 0; index < input.images.length; index += 1) {
    const image = input.images[index];
    const annotationData = parseAnnotationData(image);
    const measurements = annotationData?.measurements ?? [];

    if (input.exportContent === 'original-image') {
      const source = await input.ports.downloadOriginal(image);
      files.push({
        filename: buildExportFilename(image, input.exportContent, 'png'),
        data: await input.ports.renderImage({ source, measurements: [] }),
      });
    } else if (input.exportContent === 'annotated-image') {
      const source = await input.ports.downloadOriginal(image);
      files.push({
        filename: buildExportFilename(image, input.exportContent, 'png'),
        data: await input.ports.renderImage({
          source,
          measurements,
          annotationSize: {
            width: annotationData?.imageWidth,
            height: annotationData?.imageHeight,
          },
        }),
      });
    } else if (input.exportContent === 'annotation-points') {
      const rows = buildAnnotationPointRows(
        image,
        getDetectionLayerKeypoints({
          vertebraeLayer: annotationData?.vertebraeLayer ?? [],
          cfhAnnotation: annotationData?.cfhAnnotation,
          examType: image.description ?? '',
        })
      );
      files.push({
        filename: buildExportFilename(image, input.exportContent, 'csv'),
        data: input.ports.encodeText(
          serializeTabularRows(rows, 'csv', 'annotation-points')
        ),
      });
    } else if (input.exportContent === 'training-data') {
      const layer = annotationData?.vertebraeLayer;
      if (!layer?.length) {
        files.push({
          filename: buildExportFilename(image, 'original-image', 'png'),
          data: await input.ports.downloadOriginal(image),
        });
      } else if (annotationData?.imageWidth && annotationData.imageHeight) {
        files.push({
          filename: buildExportFilename(image, 'training-data', 'original'),
          data: await input.ports.downloadOriginal(image),
        });
        files.push({
          filename: buildTrainingLabelFilename(image),
          data: input.ports.encodeJson(
            buildTrainingLabelPayload(
              image,
              layer,
              annotationData.imageWidth,
              annotationData.imageHeight
            )
          ),
        });
      } else {
        input.ports.warn?.(`影像 ${image.id} 缺少尺寸信息，跳过训练数据导出`);
      }
    } else if (input.exportContent === 'labelme-compatible-data') {
      const pngImage = await input.ports.convertToPng(
        await input.ports.downloadOriginal(image)
      );
      const imageFilename = buildLabelMeImageFilename(image);
      const jsonFilename = buildLabelMeJsonFilename(image);
      const payload = buildLabelMeAnnotationPayload({
        imagePath: imageFilename,
        vertebraeLayer: annotationData?.vertebraeLayer ?? [],
        cfhAnnotation: annotationData?.cfhAnnotation ?? null,
        sourceSize: {
          width: annotationData?.imageWidth || pngImage.width,
          height: annotationData?.imageHeight || pngImage.height,
        },
        targetSize: { width: pngImage.width, height: pngImage.height },
      });
      files.push({
        filename: buildLabelMeExportPath(image, imageFilename),
        data: pngImage.data,
      });
      files.push({
        filename: buildLabelMeExportPath(image, jsonFilename),
        data: input.ports.encodeJson(payload),
      });
    } else {
      const rows = buildMeasurementRows(
        image,
        getParameterMeasurements(measurements)
      );
      files.push({
        filename: buildExportFilename(image, input.exportContent, 'csv'),
        data: input.ports.encodeText(
          serializeTabularRows(rows, 'csv', 'measurement-parameters')
        ),
      });
    }

    input.onProgress?.(Math.round(((index + 1) / total) * 85));
  }
  return files;
}
