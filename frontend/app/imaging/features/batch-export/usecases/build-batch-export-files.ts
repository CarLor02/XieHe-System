import {
  downloadImageFile,
  type ImageAnnotationJson,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import {
  runBatchExport,
  type ExportContentType,
} from '@xiehe/imaging-core/exports';
import {
  convertImageBlobToPngBlob,
  createAnnotatedImageBlob,
} from './create-annotated-image-export';
import type { ExportFile } from '../domain';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.batch.export.usecases.build.batch.export.files'
);

export type ExportImageFile = ImageFile & {
  annotation: ImageAnnotationJson | null;
};

function encodeJson(value: unknown): Blob {
  return new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}

export async function buildBatchExportFiles(input: {
  images: ExportImageFile[];
  exportContent: ExportContentType;
  onProgress?: (progress: number) => void;
}): Promise<ExportFile[]> {
  const artifacts = await runBatchExport<Blob>({
    ...input,
    ports: {
      downloadOriginal: image => downloadImageFile(image.id),
      renderImage: ({ source, measurements, annotationSize }) =>
        createAnnotatedImageBlob({
          imageBlob: source,
          measurements: [...measurements],
          annotationSize,
          format: 'png',
        }),
      convertToPng: async source => {
        const converted = await convertImageBlobToPngBlob(source);
        return {
          data: converted.blob,
          width: converted.width,
          height: converted.height,
        };
      },
      encodeJson,
      encodeText: ({ content, mimeType, prependBom }) =>
        new Blob(prependBom ? ['\uFEFF', content] : [content], {
          type: mimeType,
        }),
      warn: message => logger.warn(message),
    },
  });
  return artifacts.map(artifact => ({
    filename: artifact.filename,
    blob: artifact.data,
  }));
}
