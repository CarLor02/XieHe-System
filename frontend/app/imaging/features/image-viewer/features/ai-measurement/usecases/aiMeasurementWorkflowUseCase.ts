import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { getAiMeasurementsResponse } from '@/services/imageServices';
import { createEmptyBindings } from '@xiehe/imaging-core/bindings';
import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { getDescriptionForType } from '@xiehe/imaging-catalog/annotations';
import { prepareAiEditorState } from '@xiehe/imaging-core/ai';
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import { ImageData } from '@/app/imaging/features/image-viewer/shared/types';
import { KeypointAnnotation } from '@xiehe/imaging-core/keypoints';
import { detectLateralVertebrae } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiDetectionUseCase';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.ai.measurement.usecases.aiMeasurementWorkflowUseCase'
);

export async function runLateralDetectionCache({
  imageId,
  lateralDetectionResultRef,
}: {
  imageId: string;
  lateralDetectionResultRef: MutableRefObject<{
    vertebrae: VertebraAnnotation[];
    cfh: CfhAnnotation | null;
  } | null>;
}): Promise<void> {
  lateralDetectionResultRef.current = null;

  try {
    const detectResult = await detectLateralVertebrae(imageId);
    if (!detectResult || detectResult.vertebrae.length === 0) return;

    lateralDetectionResultRef.current = detectResult;
    logger.debug(
      '[lateralDetection] 预检测完成，椎体数量:',
      detectResult.vertebrae.length
    );
  } catch (error) {
    logger.warn('[lateralDetection] 预检测失败，SS 绑定推导将不可用:', error);
  }
}

export async function runAiMeasurementWorkflow({
  imageId,
  imageData,
  imageNaturalSize,
  setImageNaturalSize,
  setMeasurements,
  setPointBindings,
  setSaveMessage,
  setIsAIMeasuring,
  setIsAIDetecting,
  setVertebraeLayer,
  setKeypoints,
  setShowVertebraeLayer,
  setCfhAnnotation,
  aiMeasurementIdsRef,
}: {
  imageId: string;
  imageData: ImageData;
  imageNaturalSize: ImageSize | null;
  setImageNaturalSize: (imageSize: ImageSize) => void;
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  setPointBindings: (bindings: ReturnType<typeof createEmptyBindings>) => void;
  setSaveMessage: (message: string) => void;
  setIsAIMeasuring: (isMeasuring: boolean) => void;
  setIsAIDetecting: (isDetecting: boolean) => void;
  canUseKeypoints: boolean;
  isLateralView: boolean;
  setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>;
  setKeypoints: Dispatch<SetStateAction<KeypointAnnotation[]>>;
  setShowVertebraeLayer: (isVisible: boolean) => void;
  setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>;
  deriveInitialMeasurementsFromKeypoints: (
    nextKeypoints: KeypointAnnotation[],
    previousMeasurements: MeasurementData[]
  ) => MeasurementData[];
  lateralDetectionResultRef: MutableRefObject<{
    vertebrae: VertebraAnnotation[];
    cfh: CfhAnnotation | null;
  } | null>;
  aiMeasurementIdsRef: MutableRefObject<Set<string>>;
}): Promise<void> {
  setIsAIMeasuring(true);
  setSaveMessage('');

  try {
    const aiData = await getAiMeasurementsResponse(imageId, imageData.examType);

    if (aiData.measurements && Array.isArray(aiData.measurements)) {
      let actualImageSize = imageNaturalSize;
      if (!actualImageSize) {
        const imgElement = document.querySelector(
          '[data-image-canvas] img'
        ) as HTMLImageElement;
        if (imgElement && imgElement.naturalWidth > 0) {
          actualImageSize = {
            width: imgElement.naturalWidth,
            height: imgElement.naturalHeight,
          };
          setImageNaturalSize(actualImageSize);
        }
      }

      const calculationContext = {
        standardDistance: null,
        standardDistancePoints: [],
        imageNaturalSize: actualImageSize,
      };

      const prepared = prepareAiEditorState({
        response: aiData,
        examType: imageData.examType,
        actualImageSize,
        resolveTool: type => {
          const tool = getAnnotationConfig(type);
          if (!tool) return null;
          return {
            id: tool.id,
            category:
              tool.category === 'measurement' ? 'measurement' : 'support',
            pointsNeeded: tool.pointsNeeded,
          };
        },
        calculateValue: (type, points) =>
          calculateMeasurementValue(type, points, calculationContext),
        describeType: getDescriptionForType,
        createId: () =>
          Date.now().toString() + Math.random().toString(36).substring(2, 11),
      });
      const aiMeasurements = prepared.measurements;

      setMeasurements(aiMeasurements);
      aiMeasurementIdsRef.current = new Set(
        aiMeasurements.map((measurement: MeasurementData) => measurement.id)
      );

      // AI 替换整份标注快照时清空用户手动绑定。医学测量间的共享点位
      // 由 measurement-keypoint-sync 根据解剖关键点实时同步，禁止再根据
      // 坐标重合生成会跨点位布局持久化的 pos-* 原始下标绑定。
      setPointBindings(createEmptyBindings());
      setSaveMessage(`AI测量完成，已加载 ${aiMeasurements.length} 个标注`);
      setTimeout(() => setSaveMessage(''), 3000);

      setVertebraeLayer(prepared.vertebraeLayer);
      setKeypoints(prepared.keypoints);
      setShowVertebraeLayer(prepared.showVertebraeLayer);
      setCfhAnnotation(prepared.cfhAnnotation);
      if (!actualImageSize && prepared.imageSize) {
        setImageNaturalSize(prepared.imageSize);
      }
      setIsAIDetecting(false);
    } else {
      setSaveMessage('AI测量完成，但未返回有效数据');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  } catch (error) {
    logger.error('AI测量失败:', error);
    setSaveMessage('AI测量失败，请检查服务是否正常运行');
    setTimeout(() => setSaveMessage(''), 3000);
  } finally {
    setIsAIMeasuring(false);
  }
}
