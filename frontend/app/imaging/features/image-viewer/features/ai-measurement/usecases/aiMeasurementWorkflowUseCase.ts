import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { getAiMeasurementsResponse } from '@/services/imageServices';
import {
  autoCreatePositionBindings,
  autoCreateS1Bindings,
  createEmptyBindings,
  mergeBindings,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-calculation';
import { getDescriptionForType } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-metadata';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  CfhAnnotation,
  ImageData,
  ImageSize,
  MeasurementData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  KeypointAnnotation,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { detectLateralVertebrae } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiDetectionUseCase';

const S1_RELATED_TYPES = new Set([
  'ss',
  'll-l1-s1',
  'll-l4-s1',
  'pi',
  'pt',
  'tpa',
  'sva',
]);

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
    console.log(
      '[lateralDetection] 预检测完成，椎体数量:',
      detectResult.vertebrae.length
    );
  } catch (error) {
    console.warn('[lateralDetection] 预检测失败，SS 绑定推导将不可用:', error);
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
      const aiImageWidth = aiData.imageWidth || aiData.image_width;
      const aiImageHeight = aiData.imageHeight || aiData.image_height;

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

      let scaleX = 1;
      let scaleY = 1;

      if (actualImageSize && aiImageWidth && aiImageHeight) {
        scaleX = actualImageSize.width / aiImageWidth;
        scaleY = actualImageSize.height / aiImageHeight;
      }
      const calculationContext = {
        standardDistance: null,
        standardDistancePoints: [],
        imageNaturalSize: actualImageSize,
      };

      let cobbCount = 0;

      const aiMeasurements = filterUniqueAnnotationDuplicates(
        aiData.measurements
          .filter((measurement: any) => {
            const incomingTypeId = getAnnotationTypeId(measurement.type);
            const tool =
              getAnnotationConfig(measurement.type) ??
              getAnnotationConfig(incomingTypeId);

            if (!tool || tool.category !== 'measurement') return false;
            if (tool.id === 'sva') {
              return (
                Array.isArray(measurement.points) &&
                measurement.points.length === 5
              );
            }

            return true;
          })
          .map((measurement: any) => {
            const incomingTypeId = getAnnotationTypeId(measurement.type);
            const tool =
              getAnnotationConfig(measurement.type) ??
              getAnnotationConfig(incomingTypeId);
            const requiredPoints =
              tool?.pointsNeeded || measurement.points.length;

            let processedPoints = measurement.points;
            if (
              requiredPoints > 0 &&
              measurement.points.length > requiredPoints
            ) {
              processedPoints = measurement.points.slice(0, requiredPoints);
            }

            const scaledPoints = processedPoints.map((point: any) => ({
              x: point.x * scaleX,
              y: point.y * scaleY,
            }));

            let finalType = tool?.id || incomingTypeId;
            let isCobb = false;
            if (measurement.type.startsWith('Cobb-')) {
              cobbCount++;
              finalType = `cobb${cobbCount}`;
              isCobb = true;
            }

            const typeForCalculation = isCobb ? 'cobb' : finalType;
            const value =
              typeof measurement.value === 'string' && measurement.value
                ? measurement.value
                : calculateMeasurementValue(
                    typeForCalculation,
                    scaledPoints,
                    calculationContext
                  );

            if (isCobb) {
              console.log(`[DEBUG] ${finalType} 椎体信息:`, {
                upper_vertebra: measurement.upper_vertebra,
                lower_vertebra: measurement.lower_vertebra,
                apex_vertebra: measurement.apex_vertebra,
                原始数据: measurement,
              });
            }

            return {
              id:
                Date.now().toString() +
                Math.random().toString(36).substring(2, 11),
              type: finalType,
              value,
              points: scaledPoints,
              description: isCobb
                ? 'Cobb角测量'
                : getDescriptionForType(finalType),
              originalType: measurement.type,
              upperVertebra: measurement.upper_vertebra,
              lowerVertebra: measurement.lower_vertebra,
              apexVertebra: measurement.apex_vertebra,
            };
          })
      );

      setMeasurements(aiMeasurements);
      aiMeasurementIdsRef.current = new Set(
        aiMeasurements.map((measurement: MeasurementData) => measurement.id)
      );

      const s1Count = aiMeasurements.filter((measurement: any) =>
        S1_RELATED_TYPES.has(getAnnotationTypeId(measurement.type))
      ).length;
      const s1Bindings =
        s1Count >= 2
          ? autoCreateS1Bindings(aiMeasurements)
          : createEmptyBindings();
      const posBindings = autoCreatePositionBindings(aiMeasurements);
      setPointBindings(mergeBindings(s1Bindings, posBindings));
      setSaveMessage(`AI测量完成，已加载 ${aiMeasurements.length} 个标注`);
      setTimeout(() => setSaveMessage(''), 3000);

      if (Array.isArray(aiData.vertebrae) && aiData.vertebrae.length > 0) {
        setVertebraeLayer(aiData.vertebrae);
        setKeypoints(
          vertebraeLayerToKeypoints(
            aiData.vertebrae,
            imageData.examType,
            aiData.cfh ?? null
          )
        );
        setShowVertebraeLayer(true);
      } else {
        setVertebraeLayer([]);
        setKeypoints([]);
        setShowVertebraeLayer(false);
      }
      setCfhAnnotation(aiData.cfh ?? null);
      setIsAIDetecting(false);
    } else {
      setSaveMessage('AI测量完成，但未返回有效数据');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  } catch (error) {
    console.error('AI测量失败:', error);
    setSaveMessage('AI测量失败，请检查服务是否正常运行');
    setTimeout(() => setSaveMessage(''), 3000);
  } finally {
    setIsAIMeasuring(false);
  }
}
