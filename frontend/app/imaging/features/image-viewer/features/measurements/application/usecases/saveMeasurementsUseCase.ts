import {
  MeasurementData,
  Point,
  ImageSize,
  VertebraAnnotation,
  CfhAnnotation,
} from '@xiehe/imaging-core/contracts';
import { prepareAnnotationSave } from '@xiehe/imaging-core/annotation-document';
import { AnnotationBindings } from '@xiehe/imaging-core/bindings';
import { parseImageFileApiId } from '@xiehe/imaging-core/image-files';
import { saveImageAnnotation } from '@/services/imageServices';
import { saveLocalAnnotationBackup } from './localAnnotationStorage';
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
    const savePlan = prepareAnnotationSave({
      imageNaturalSize,
      measurements,
      standardDistance,
      standardDistancePoints,
      pointBindings,
      reportText,
      savedAt: new Date().toISOString(),
      vertebraeLayer,
      cfhAnnotation,
    });
    const annotationDocument = savePlan.document;

    // 1. 先写本地维护缓存；失败不能阻断后续服务器保存。
    // 本地和服务器共享同一份无损版本化文档，避免两条恢复链路字段漂移。
    const localBackupResult = saveLocalAnnotationBackup(
      imageId,
      annotationDocument
    );
    if (localBackupResult.saved) {
      logger.debug(
        `已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`
      );
    } else {
      logger.warn(
        '本地标注缓存保存失败，继续保存服务器:',
        localBackupResult.reason
      );
    }

    // 2. 保存到服务器
    const result = await saveImageAnnotation(
      parseImageFileApiId(imageId),
      annotationVersion,
      annotationDocument
    );
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
