import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import {
  ImageData,
} from '@/app/imaging/features/image-viewer/shared/types';
import { AnnotationBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { saveMeasurements } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/saveMeasurementsUseCase';
import { runAiMeasurementWorkflow } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type { LateralDetectionCache } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync';

interface UseStudyHeaderActionsOptions {
  imageId: string;
  imageData: ImageData;
  annotationVersion: number;
  setAnnotationVersion: (version: number) => void;
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
  onAnnotationConflict?: (message: string) => void;
}

export function useStudyHeaderActions({
  imageId,
  imageData,
  annotationVersion,
  setAnnotationVersion,
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
  onAnnotationConflict,
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
      annotationVersion,
      setAnnotationVersion,
      imageNaturalSize,
      standardDistance,
      standardDistancePoints,
      pointBindings,
      measurements,
      reportText,
      setIsSaving,
      setSaveMessage,
      activeVertebraeLayer,
      cfhAnnotation,
      onAnnotationConflict
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
    annotationVersion,
    onAnnotationConflict,
    setAnnotationVersion,
  ]);

  return {
    isSaving,
    isAIDetecting,
    isAIMeasuring,
    handleAIMeasurement,
    handleSaveMeasurements,
  };
}
