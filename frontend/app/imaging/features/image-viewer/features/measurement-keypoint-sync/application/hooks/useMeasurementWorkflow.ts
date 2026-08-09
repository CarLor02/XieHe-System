import { Dispatch, SetStateAction, useCallback } from 'react';
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import {
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { addMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/addMeasurementUseCase';
import {
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  vertebraeLayerToKeypoints,
} from '@xiehe/imaging-core/keypoints';
import {
  getMeasurementKeypointBindingRule,
  getMeasurementKeypointBindingRuleForMeasurement,
  writeMeasurementToKeypoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-binding';
import {
  type FemoralHeadMode,
} from '@xiehe/imaging-core/contracts';
import {
  createPelvicMeasurementMetadata,
} from '@xiehe/imaging-core/measurements/lateral';
import { applyMeasurementPointToVertebrae } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-writeback';
import { deriveMissingFixedMeasurementsFromKeypoints } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/deriveMissingFixedMeasurementsUseCase';

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
    (
      toolType: string,
      points: Point[],
      options: { pelvicMode?: FemoralHeadMode } = {}
    ) => {
      const typeId = getAnnotationTypeId(toolType);
      const allowReplace = !canUseKeypoints || isLateralView;
      const pelvicMetadata = options.pelvicMode
        ? createPelvicMeasurementMetadata(options.pelvicMode)
        : undefined;
      const bindingMeasurement: MeasurementData = {
        id: 'manual-binding-probe',
        type: toolType,
        value: '',
        points,
        pelvicMetadata,
      };
      const bindingRule = canUseKeypoints
        ? pelvicMetadata
          ? getMeasurementKeypointBindingRuleForMeasurement(bindingMeasurement)
          : getMeasurementKeypointBindingRule(toolType)
        : null;
      const normalizedPoints = bindingRule
        ? bindingRule.normalizePoints(points).points
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
          pelvicMetadata,
        }
      );

      if (bindingRule) {
        const nextKeypoints = writeMeasurementToKeypoints(
          keypoints,
          { ...bindingMeasurement, points: normalizedPoints },
          normalizedPoints
        );
        if (nextKeypoints !== keypoints) {
          setKeypoints(nextKeypoints);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          if (isLateralView) {
            // 双 FH 与 CFH 互斥；切到双 FH 时必须允许清空旧 cfhAnnotation，
            // 不能用旧值回退，否则重新加载后会形成冲突状态。
            setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
          }
          setMeasurements(previous => {
            const recalculated = recalculateKeypointMeasurements(
              previous,
              nextKeypoints
            );
            return deriveMissingFixedMeasurementsFromKeypoints({
              previousMeasurements: recalculated,
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
