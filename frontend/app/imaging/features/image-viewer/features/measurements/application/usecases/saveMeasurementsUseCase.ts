import {
  MeasurementData,
  Point,
  ImageSize,
  VertebraAnnotation,
  CfhAnnotation,
} from '@xiehe/imaging-core/contracts';
import { runAnnotationSave } from '@xiehe/imaging-core/annotation-document';
import { AnnotationBindings } from '@xiehe/imaging-core/bindings';
import { parseImageFileApiId } from '@xiehe/imaging-core/image-files';
import { saveImageAnnotation } from '@/services/imageServices';
import { createLogger } from '@/lib/logger';
import { getApiErrorMessage, getApiErrorStatus } from '@xiehe/api-client';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.measurements.application.usecases.saveMeasurementsUseCase'
);

export async function saveMeasurements(
  imageId: string,
  annotationVersion: number,
  onAnnotationVersionChange: (version: number) => void,
  imageNaturalSize: ImageSize | null,
  standardDistance: number | null,
  standardDistancePoints: Point[] | null,
  pointBindings: AnnotationBindings,
  measurements: MeasurementData[],
  reportText: string,
  setIsSaving: (state: boolean) => void,
  setSaveMessage: (message: string) => void,
  vertebraeLayer: VertebraAnnotation[] = [],
  cfhAnnotation: CfhAnnotation | null = null,
  onConflict?: (message: string) => void
) {
  setIsSaving(true);
  setSaveMessage('');
  try {
    const { plan: savePlan, result } = await runAnnotationSave({
      imageId: parseImageFileApiId(imageId),
      expectedVersion: annotationVersion,
      snapshot: {
        imageNaturalSize,
        measurements,
        standardDistance,
        standardDistancePoints,
        pointBindings,
        reportText,
        savedAt: new Date().toISOString(),
        vertebraeLayer,
        cfhAnnotation,
      },
      port: {
        save: ({ imageId: fileId, expectedVersion, annotation }) =>
          saveImageAnnotation(fileId, expectedVersion, annotation),
      },
    });
    onAnnotationVersionChange(result.annotation_version);
    logger.debug(`标注快照已保存为版本 ${result.annotation_version}`);
    setSaveMessage(savePlan.successMessage);
    setTimeout(() => setSaveMessage(''), 3000);
  } catch (error: unknown) {
    logger.error('保存测量数据失败:', error);
    const errorMessage = getApiErrorMessage(error, '保存失败，请重试');
    if (getApiErrorStatus(error) === 409) {
      onConflict?.(errorMessage);
    }
    setSaveMessage(`保存失败: ${errorMessage}`);
    setTimeout(() => setSaveMessage(''), 5000);
  } finally {
    setIsSaving(false);
  }
}
