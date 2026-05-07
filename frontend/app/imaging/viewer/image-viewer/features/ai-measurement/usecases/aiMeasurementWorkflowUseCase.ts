import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { getAiMeasurementsResponse } from '@/services/imageServices';
import {
  autoCreatePositionBindings,
  autoCreateS1Bindings,
  createEmptyBindings,
  mergeBindings,
} from '@/app/imaging/viewer/image-viewer/features/bindings/domain/annotation-binding';
import { getAnnotationConfig, getAnnotationTypeId } from '@/app/imaging/viewer/image-viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue } from '@/app/imaging/viewer/image-viewer/features/measurements/domain/annotation-calculation';
import { getDescriptionForType } from '@/app/imaging/viewer/image-viewer/features/measurements/domain/annotation-metadata';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/viewer/image-viewer/features/measurements/domain/annotation-uniqueness';
import {
  CfhAnnotation,
  ImageData,
  ImageSize,
  MeasurementData,
  VertebraAnnotation,
} from '@/app/imaging/viewer/image-viewer/shared/types';
import {
  keypointsToPersistedLayer,
  KeypointAnnotation,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/viewer/image-viewer/features/keypoints/domain/keypoint-state';
import { deriveAllMeasurements } from '@/app/imaging/viewer/image-viewer/features/keypoints/domain/vertebrae-derive';
import { aiDetect, detectLateralVertebrae } from './aiDetectionUseCase';

const S1_RELATED_TYPES = new Set([
  'ss',
  'll-l1-s1',
  'll-l4-s1',
  'pi',
  'pt',
  'tpa',
  'sva',
]);

export async function getImageBlobFromCanvasImage(): Promise<Blob | null> {
  const imgEl = document.querySelector(
    '[data-image-canvas] img'
  ) as HTMLImageElement | null;
  if (!imgEl) return null;

  return new Promise<Blob | null>(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.drawImage(imgEl, 0, 0);
    canvas.toBlob(blob => resolve(blob));
  });
}

export async function runLateralDetectionCache({
  lateralDetectionResultRef,
}: {
  lateralDetectionResultRef: MutableRefObject<{
    vertebrae: VertebraAnnotation[];
    cfh: CfhAnnotation | null;
  } | null>;
}): Promise<void> {
  lateralDetectionResultRef.current = null;

  try {
    const blob = await getImageBlobFromCanvasImage();
    if (!blob) return;

    const detectResult = await detectLateralVertebrae(blob);
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
  measurements,
  setMeasurements,
  setPointBindings,
  setSaveMessage,
  setIsAIMeasuring,
  setIsAIDetecting,
  canUseKeypoints,
  isLateralView,
  setVertebraeLayer,
  setKeypoints,
  setShowVertebraeLayer,
  setCfhAnnotation,
  rebuildKeypointMeasurements,
  lateralDetectionResultRef,
  aiMeasurementIdsRef,
}: {
  imageId: string;
  imageData: ImageData;
  imageNaturalSize: ImageSize | null;
  setImageNaturalSize: (imageSize: ImageSize) => void;
  measurements: MeasurementData[];
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
  rebuildKeypointMeasurements: (
    previousMeasurements: MeasurementData[],
    nextKeypoints: KeypointAnnotation[]
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
    const aiData = await getAiMeasurementsResponse(
      imageId,
      imageData.examType
    );

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

      let cobbCount = measurements.filter(measurement =>
        /^cobb\d+$/i.test(measurement.type)
      ).length;

      const aiMeasurements = filterUniqueAnnotationDuplicates(
        aiData.measurements
          .filter((measurement: any) => {
            const incomingTypeId = getAnnotationTypeId(measurement.type);
            const tool =
              getAnnotationConfig(measurement.type) ??
              getAnnotationConfig(incomingTypeId);

            if (!tool || tool.category !== 'measurement') return false;
            if (isLateralView && S1_RELATED_TYPES.has(tool.id)) return false;
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
            const requiredPoints = tool?.pointsNeeded || measurement.points.length;

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
            const value = calculateMeasurementValue(
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

      if (canUseKeypoints) {
        setSaveMessage('AI检测中...');
        void aiDetect(
          canUseKeypoints,
          imageData,
          layerOrUpdater => {
            setVertebraeLayer(previous => {
              const nextLayer =
                typeof layerOrUpdater === 'function'
                  ? layerOrUpdater(previous)
                  : layerOrUpdater;
              const nextKeypoints = vertebraeLayerToKeypoints(
                nextLayer,
                imageData.examType
              );
              setKeypoints(nextKeypoints);
              setShowVertebraeLayer(true);
              setMeasurements(previousMeasurements =>
                rebuildKeypointMeasurements(previousMeasurements, nextKeypoints)
              );
              return nextLayer;
            });
          },
          setCfhAnnotation,
          setSaveMessage,
          setIsAIDetecting
        );
      } else if (isLateralView) {
        void (async () => {
          try {
            let detectResult = lateralDetectionResultRef.current;
            if (!detectResult) {
              const blob = await getImageBlobFromCanvasImage();
              if (!blob) return;

              detectResult = await detectLateralVertebrae(blob);
              if (!detectResult || detectResult.vertebrae.length === 0) return;
              lateralDetectionResultRef.current = detectResult;
            }

            const derived = deriveAllMeasurements(
              detectResult.vertebrae,
              detectResult.cfh,
              imageData.examType
            );

            const derivedNonS1WithValues = derived
              .filter(
                measurement =>
                  !S1_RELATED_TYPES.has(getAnnotationTypeId(measurement.type))
              )
              .map(measurement => ({
                ...measurement,
                value: calculateMeasurementValue(
                  measurement.type,
                  measurement.points,
                  calculationContext
                ),
              }));

            if (derivedNonS1WithValues.length === 0) return;

            setMeasurements(previous => {
              const existingTypeIds = new Set(
                previous.map(measurement =>
                  getAnnotationTypeId(measurement.type)
                )
              );
              const missing = derivedNonS1WithValues.filter(
                measurement =>
                  !existingTypeIds.has(getAnnotationTypeId(measurement.type))
              );
              if (missing.length === 0) return previous;
              console.log(
                `[handleAIMeasurement] 侧位推导补全 ${missing.length} 个测量:`,
                missing.map(measurement => measurement.type)
              );
              return [...previous, ...missing];
            });
          } catch (error) {
            console.warn('[handleAIMeasurement] 侧位推导补全失败，跳过:', error);
          }
        })();
      }
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
