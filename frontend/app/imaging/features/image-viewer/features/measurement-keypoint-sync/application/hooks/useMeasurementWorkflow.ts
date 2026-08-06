import { Dispatch, SetStateAction, useCallback } from 'react';
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  Tool,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { addMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/addMeasurementUseCase';
import {
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  getMeasurementKeypointBindingRule,
  normalizeBoundMeasurementPoints,
  writeMeasurementPointsToKeypoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-binding';
import { applyMeasurementPointToVertebrae } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-writeback';
import { deriveMeasurementsAfterToolCompletion } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/deriveMeasurementsAfterToolCompletionUseCase';

interface UseMeasurementWorkflowOptions {
  examType: string;
  tools: Tool[];
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: ImageSize | null;
  canUseKeypoints: boolean;
  isLateralView: boolean;
  isKeypointExam: boolean;
  keypoints: KeypointAnnotation[];
  setKeypoints: Dispatch<SetStateAction<KeypointAnnotation[]>>;
  activeVertebraeLayer: VertebraAnnotation[];
  setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>;
  cfhAnnotation: CfhAnnotation | null;
  setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>;
  recalculateKeypointMeasurements: (
    previousMeasurements: MeasurementData[],
    nextKeypoints: KeypointAnnotation[]
  ) => MeasurementData[];
}

export function useMeasurementWorkflow({
  examType,
  tools,
  measurements,
  setMeasurements,
  standardDistance,
  standardDistancePoints,
  imageNaturalSize,
  canUseKeypoints,
  isLateralView,
  isKeypointExam,
  keypoints,
  setKeypoints,
  activeVertebraeLayer,
  setVertebraeLayer,
  cfhAnnotation,
  setCfhAnnotation,
  recalculateKeypointMeasurements,
}: UseMeasurementWorkflowOptions) {
  const handleAddMeasurement = useCallback(
    (toolType: string, points: Point[]) => {
      const typeId = getAnnotationTypeId(toolType);
      const allowReplace = !canUseKeypoints || isLateralView;
      const bindingRule = canUseKeypoints
        ? getMeasurementKeypointBindingRule(toolType)
        : null;
      const normalizedPoints = bindingRule
        ? normalizeBoundMeasurementPoints(toolType, points)
        : points;
      addMeasurement(
        toolType,
        normalizedPoints,
        measurements,
        setMeasurements,
        tools,
        standardDistance,
        standardDistancePoints,
        imageNaturalSize ?? { width: 0, height: 0 },
        {
          allowReplace,
          keypointSynced: bindingRule !== null,
        }
      );

      if (bindingRule) {
        const nextKeypoints = writeMeasurementPointsToKeypoints(
          keypoints,
          toolType,
          normalizedPoints
        );
        if (nextKeypoints !== keypoints) {
          setKeypoints(nextKeypoints);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          if (isLateralView) {
            setCfhAnnotation(
              keypointsToCfhAnnotation(nextKeypoints) ?? cfhAnnotation
            );
          }
          setMeasurements(previous => {
            const recalculated = recalculateKeypointMeasurements(
              previous,
              nextKeypoints
            );
            return deriveMeasurementsAfterToolCompletion({
              previousMeasurements: recalculated,
              completedToolType: toolType,
              keypoints: nextKeypoints,
              examType,
              calculationContext: {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize: imageNaturalSize ?? { width: 0, height: 0 },
              },
            });
          });
        }
        return;
      }

      if (canUseKeypoints && isLateralView && typeId !== 'ss') {
        let currentLayer = activeVertebraeLayer;
        let currentCfh = cfhAnnotation;
        for (let i = 0; i < normalizedPoints.length; i++) {
          const result = applyMeasurementPointToVertebrae(
            currentLayer,
            currentCfh,
            toolType,
            i,
            normalizedPoints[i]
          );
          currentLayer = result.vertebraeLayer;
          currentCfh = result.cfhAnnotation;
        }
        if (currentLayer !== activeVertebraeLayer) {
          setVertebraeLayer(currentLayer);
          if (isKeypointExam) {
            setKeypoints(vertebraeLayerToKeypoints(currentLayer, examType));
          }
        }
        if (currentCfh !== cfhAnnotation) {
          setCfhAnnotation(currentCfh);
        }
      }
    },
    [
      activeVertebraeLayer,
      canUseKeypoints,
      cfhAnnotation,
      examType,
      imageNaturalSize,
      isKeypointExam,
      isLateralView,
      keypoints,
      measurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
      standardDistance,
      standardDistancePoints,
      recalculateKeypointMeasurements,
      tools,
    ]
  );

  return { handleAddMeasurement };
}
