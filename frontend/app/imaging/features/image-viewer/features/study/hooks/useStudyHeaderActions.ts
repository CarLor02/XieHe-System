import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import {
  CfhAnnotation,
  ImageData,
  ImageSize,
  MeasurementData,
  Point,
  StudyData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import { AnnotationBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { saveMeasurements } from '@/app/imaging/features/image-viewer/features/measurements/usecases/saveMeasurementsUseCase';
import { runAiMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { LateralDetectionCache } from '@/app/imaging/features/image-viewer/features/keypoints/hooks/useKeypointMeasurementWorkflow';

interface UseStudyHeaderActionsOptions {
  imageId: string;
  imageData: ImageData;
  studyData: StudyData | null;
  imageNaturalSize: ImageSize | null;
  setImageNaturalSize: (imageSize: ImageSize) => void;
  standardDistance: number | null;
  standardDistancePoints: Point[];
  pointBindings: AnnotationBindings;
  setPointBindings: (bindings: AnnotationBindings) => void;
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  reportText: string;
  activeVertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
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
  lateralDetectionResultRef: MutableRefObject<LateralDetectionCache | null>;
  aiMeasurementIdsRef: MutableRefObject<Set<string>>;
  setSaveMessage: (message: string) => void;
}

export function useStudyHeaderActions({
  imageId,
  imageData,
  studyData,
  imageNaturalSize,
  setImageNaturalSize,
  standardDistance,
  standardDistancePoints,
  pointBindings,
  setPointBindings,
  measurements,
  setMeasurements,
  reportText,
  activeVertebraeLayer,
  cfhAnnotation,
  canUseKeypoints,
  isLateralView,
  setVertebraeLayer,
  setKeypoints,
  setShowVertebraeLayer,
  setCfhAnnotation,
  deriveInitialMeasurementsFromKeypoints,
  lateralDetectionResultRef,
  aiMeasurementIdsRef,
  setSaveMessage,
}: UseStudyHeaderActionsOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAIDetecting, setIsAIDetecting] = useState(false);
  const [isAIMeasuring, setIsAIMeasuring] = useState(false);

  const handleAIMeasurement = useCallback(() => {
    void runAiMeasurementWorkflow({
      imageId,
      imageData,
      imageNaturalSize,
      setImageNaturalSize,
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
      deriveInitialMeasurementsFromKeypoints,
      lateralDetectionResultRef,
      aiMeasurementIdsRef,
    });
  }, [
    aiMeasurementIdsRef,
    canUseKeypoints,
    deriveInitialMeasurementsFromKeypoints,
    imageData,
    imageId,
    imageNaturalSize,
    isLateralView,
    lateralDetectionResultRef,
    setCfhAnnotation,
    setImageNaturalSize,
    setKeypoints,
    setMeasurements,
    setPointBindings,
    setSaveMessage,
    setShowVertebraeLayer,
    setVertebraeLayer,
  ]);

  const handleSaveMeasurements = useCallback(() => {
    void saveMeasurements(
      imageId,
      studyData,
      imageNaturalSize,
      standardDistance,
      standardDistancePoints,
      pointBindings,
      measurements,
      reportText,
      setIsSaving,
      setSaveMessage,
      activeVertebraeLayer,
      cfhAnnotation
    );
  }, [
    activeVertebraeLayer,
    cfhAnnotation,
    imageId,
    imageNaturalSize,
    measurements,
    pointBindings,
    reportText,
    setSaveMessage,
    standardDistance,
    standardDistancePoints,
    studyData,
  ]);

  return {
    isSaving,
    isAIDetecting,
    isAIMeasuring,
    handleAIMeasurement,
    handleSaveMeasurements,
  };
}
