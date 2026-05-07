import {
  Dispatch,
  SetStateAction,
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  AnnotationSource,
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  Tool,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { AP_AUTOMATIC_MEASUREMENT_TOOL_IDS } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/measurements';
import { LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements';
import { getInheritedPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-inheritance';
import { filterUniqueAnnotationDuplicates } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import { addMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/usecases/addMeasurementUseCase';
import {
  exportAnnotationsToJSON as exportAnnotationsToJSONUseCase,
  importAnnotationsFromJSON as importAnnotationsFromJSONUseCase,
} from '@/app/imaging/features/image-viewer/features/measurements/usecases/annotationJsonUseCase';
import {
  extractCfhAnnotationFromMeasurements,
  LATERAL_CFH_DEPENDENT_MEASUREMENT_TYPES,
  LATERAL_S1_DEPENDENT_MEASUREMENT_TYPES,
  measurementTypeInSet,
  restorePiPtFromSsAndCfh,
} from '@/app/imaging/features/image-viewer/features/measurements/usecases/measurementDependencyUseCase';
import { calculateMeasurementValue as calcMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-calculation';
import {
  applyMeasurementPointToVertebrae,
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  removeKeypointsById,
  upsertKeypoint,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';

type AutomaticToolStatus = 'available' | 'exists' | 'missing-keypoints';

interface UseMeasurementWorkflowOptions {
  imageId: string;
  examType: string;
  isAdmin: boolean;
  tools: Tool[];
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  selectedTool: string;
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: ImageSize | null;
  calculationContext: CalculationContext;
  calculateMeasurementValue: (type: string, points: Point[]) => string;
  getDescriptionForType: (type: string) => string;
  setStandardDistance: (distance: number | null) => void;
  setStandardDistancePoints: (points: Point[]) => void;
  setSaveMessage: (message: string) => void;
  canUseKeypoints: boolean;
  isAnteriorView: boolean;
  isLateralView: boolean;
  isKeypointExam: boolean;
  keypoints: KeypointAnnotation[];
  setKeypoints: Dispatch<SetStateAction<KeypointAnnotation[]>>;
  activeVertebraeLayer: VertebraAnnotation[];
  setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>;
  cfhAnnotation: CfhAnnotation | null;
  setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>;
  rebuildKeypointMeasurements: (
    previousMeasurements: MeasurementData[],
    nextKeypoints: KeypointAnnotation[]
  ) => MeasurementData[];
  deriveKeypointMeasurements: (
    nextKeypoints: KeypointAnnotation[]
  ) => MeasurementData[];
}

function flashMessage(
  setSaveMessage: (message: string) => void,
  message: string,
  delay = 3000
) {
  setSaveMessage(message);
  setTimeout(() => setSaveMessage(''), delay);
}

export function useMeasurementWorkflow({
  imageId,
  examType,
  isAdmin,
  tools,
  measurements,
  setMeasurements,
  selectedTool,
  clickedPoints,
  setClickedPoints,
  standardDistance,
  standardDistancePoints,
  imageNaturalSize,
  calculationContext,
  calculateMeasurementValue,
  getDescriptionForType,
  setStandardDistance,
  setStandardDistancePoints,
  setSaveMessage,
  canUseKeypoints,
  isAnteriorView,
  isLateralView,
  isKeypointExam,
  keypoints,
  setKeypoints,
  activeVertebraeLayer,
  setVertebraeLayer,
  cfhAnnotation,
  setCfhAnnotation,
  rebuildKeypointMeasurements,
  deriveKeypointMeasurements,
}: UseMeasurementWorkflowOptions) {
  useEffect(() => {
    if (!selectedTool || selectedTool === 'hand' || clickedPoints.length > 0) {
      return;
    }

    const currentTool = tools.find(tool => tool.id === selectedTool);
    if (
      !currentTool ||
      !currentTool.pointsNeeded ||
      currentTool.pointsNeeded <= 0
    ) {
      return;
    }

    if (
      currentTool.id === 'sva' ||
      currentTool.id === 'ss' ||
      currentTool.id === 'cl' ||
      currentTool.id === 'll-l1-s1' ||
      currentTool.id === 'll-l1-l4' ||
      currentTool.id === 'll-l4-s1' ||
      currentTool.id === 'pi' ||
      currentTool.id === 'pt' ||
      currentTool.id === 'tpa' ||
      currentTool.id === 'ts' ||
      currentTool.id === 'tts'
    ) {
      return;
    }

    const { points: inheritedPoints } = getInheritedPoints(
      currentTool.id,
      measurements
    );
    if (inheritedPoints.length > 0) {
      setClickedPoints(inheritedPoints);
    }
  }, [selectedTool, measurements, clickedPoints.length, tools, setClickedPoints]);

  const handleAddMeasurement = useCallback(
    (toolType: string, points: Point[]) => {
      const typeId = getAnnotationTypeId(toolType);

      if (canUseKeypoints && isLateralView && typeId === 'ss') {
        const s1P0 = points[0] ?? { x: 0, y: 0 };
        const s1P1 = points[1] ?? { x: 0, y: 0 };
        let nextKeypoints = upsertKeypoint(keypoints, {
          id: 'S1-1',
          point: s1P0,
          source: AnnotationSource.MANUAL,
          confidence: 1,
        });
        nextKeypoints = upsertKeypoint(nextKeypoints, {
          id: 'S1-2',
          point: s1P1,
          source: AnnotationSource.MANUAL,
          confidence: 1,
        });
        setKeypoints(nextKeypoints);
        setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
        setCfhAnnotation(
          keypointsToCfhAnnotation(nextKeypoints) ?? cfhAnnotation
        );
        setMeasurements(previous =>
          rebuildKeypointMeasurements(previous, nextKeypoints)
        );
        return;
      }

      const allowReplace = !canUseKeypoints || isLateralView;
      addMeasurement(
        toolType,
        points,
        measurements,
        setMeasurements,
        tools,
        standardDistance,
        standardDistancePoints,
        imageNaturalSize ?? { width: 0, height: 0 },
        allowReplace
      );

      if (isLateralView && typeId === 'ss' && cfhAnnotation) {
        setMeasurements(previous =>
          restorePiPtFromSsAndCfh(
            previous,
            cfhAnnotation,
            (nextType, nextPoints) =>
              calcMeasurementValue(nextType, nextPoints, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
              })
          )
        );
      }

      if (canUseKeypoints && isLateralView && typeId !== 'ss') {
        let currentLayer = activeVertebraeLayer;
        let currentCfh = cfhAnnotation;
        for (let i = 0; i < points.length; i++) {
          const result = applyMeasurementPointToVertebrae(
            currentLayer,
            currentCfh,
            toolType,
            i,
            points[i]
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
      rebuildKeypointMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
      standardDistance,
      standardDistancePoints,
      tools,
    ]
  );

  const handleMeasurementDelete = useCallback(
    (measurementId: string) => {
      const target = measurements.find(item => item.id === measurementId);
      if (!target) {
        setMeasurements(previous =>
          previous.filter(item => item.id !== measurementId)
        );
        return;
      }

      const typeId = getAnnotationTypeId(target.type);

      if (isLateralView && isKeypointExam && keypoints.length > 0) {
        if (typeId === 'pi' || typeId === 'pt') {
          const nextKeypoints = removeKeypointsById(keypoints, ['CFH']);
          setKeypoints(nextKeypoints);
          setCfhAnnotation(null);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          setMeasurements(previous =>
            rebuildKeypointMeasurements(
              previous.filter(
                measurement =>
                  !measurementTypeInSet(
                    measurement,
                    LATERAL_CFH_DEPENDENT_MEASUREMENT_TYPES
                  )
              ),
              nextKeypoints
            )
          );
          return;
        }

        if (typeId === 'ss') {
          const preservedCfh =
            cfhAnnotation ??
            keypointsToCfhAnnotation(keypoints) ??
            extractCfhAnnotationFromMeasurements(measurements);
          const nextKeypoints = removeKeypointsById(keypoints, [
            'S1-1',
            'S1-2',
          ]);
          setKeypoints(nextKeypoints);
          if (preservedCfh) setCfhAnnotation(preservedCfh);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          setMeasurements(previous =>
            rebuildKeypointMeasurements(
              previous.filter(
                measurement =>
                  !measurementTypeInSet(
                    measurement,
                    LATERAL_S1_DEPENDENT_MEASUREMENT_TYPES
                  )
              ),
              nextKeypoints
            )
          );
          return;
        }
      }

      if (isLateralView && (typeId === 'pi' || typeId === 'pt')) {
        setCfhAnnotation(null);
        setMeasurements(previous =>
          previous.filter(
            measurement =>
              !measurementTypeInSet(
                measurement,
                LATERAL_CFH_DEPENDENT_MEASUREMENT_TYPES
              )
          )
        );
        return;
      }

      if (isLateralView && typeId === 'ss') {
        const preservedCfh =
          cfhAnnotation ?? extractCfhAnnotationFromMeasurements(measurements);
        if (preservedCfh) setCfhAnnotation(preservedCfh);
        setMeasurements(previous =>
          previous.filter(
            measurement =>
              !measurementTypeInSet(
                measurement,
                LATERAL_S1_DEPENDENT_MEASUREMENT_TYPES
              )
          )
        );
        return;
      }

      setMeasurements(previous =>
        previous.filter(item => item.id !== measurementId)
      );
    },
    [
      cfhAnnotation,
      isKeypointExam,
      isLateralView,
      keypoints,
      measurements,
      rebuildKeypointMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
    ]
  );

  const measurementMatchesTool = useCallback(
    (measurement: MeasurementData, toolId: string): boolean =>
      getAnnotationTypeId(measurement.type) === getAnnotationTypeId(toolId),
    []
  );

  const derivedMeasurementExists = useCallback(
    (
      currentMeasurements: MeasurementData[],
      candidate: MeasurementData,
      toolId: string
    ): boolean => {
      if (getAnnotationTypeId(toolId) === 'cobb') {
        return currentMeasurements.some(item => item.id === candidate.id);
      }
      return currentMeasurements.some(item =>
        measurementMatchesTool(item, toolId)
      );
    },
    [measurementMatchesTool]
  );

  const getDerivedMeasurementsForTool = useCallback(
    (toolId: string): MeasurementData[] => {
      if (!isKeypointExam) return [];
      return deriveKeypointMeasurements(keypoints).filter(measurement =>
        measurementMatchesTool(measurement, toolId)
      );
    },
    [
      deriveKeypointMeasurements,
      isKeypointExam,
      keypoints,
      measurementMatchesTool,
    ]
  );

  const automaticToolStatus = useMemo(() => {
    const status: Record<string, AutomaticToolStatus> = {};
    const restorableToolIds = isLateralView
      ? LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS
      : isAnteriorView
        ? AP_AUTOMATIC_MEASUREMENT_TOOL_IDS
        : [];
    restorableToolIds.forEach(toolId => {
      const candidates = getDerivedMeasurementsForTool(toolId);
      const hasRestorableCandidate = candidates.some(
        candidate => !derivedMeasurementExists(measurements, candidate, toolId)
      );
      if (hasRestorableCandidate) {
        status[toolId] = 'available';
      } else if (candidates.length > 0) {
        status[toolId] = 'exists';
      } else {
        status[toolId] = 'missing-keypoints';
      }
    });
    return status;
  }, [
    derivedMeasurementExists,
    getDerivedMeasurementsForTool,
    isAnteriorView,
    isLateralView,
    measurements,
  ]);

  const handleRestoreAutomaticMeasurement = useCallback(
    (toolId: string) => {
      const candidates = getDerivedMeasurementsForTool(toolId);
      const missing = candidates.filter(
        candidate => !derivedMeasurementExists(measurements, candidate, toolId)
      );
      if (missing.length === 0) {
        const toolName = getAnnotationConfig(toolId)?.name ?? toolId;
        flashMessage(setSaveMessage, `${toolName} 当前不可恢复`);
        return;
      }

      setMeasurements(previous => {
        const additions = missing.filter(
          candidate => !derivedMeasurementExists(previous, candidate, toolId)
        );
        return filterUniqueAnnotationDuplicates([...previous, ...additions]);
      });

      const toolName = getAnnotationConfig(toolId)?.name ?? toolId;
      flashMessage(setSaveMessage, `已恢复 ${toolName}`);
    },
    [
      derivedMeasurementExists,
      getDerivedMeasurementsForTool,
      measurements,
      setMeasurements,
      setSaveMessage,
    ]
  );

  const exportAnnotationsToJSON = useCallback(() => {
    exportAnnotationsToJSONUseCase({
      isAdmin,
      imageId,
      imageNaturalSize,
      measurements,
      standardDistance,
      standardDistancePoints,
      setSaveMessage,
    });
  }, [
    imageId,
    imageNaturalSize,
    isAdmin,
    measurements,
    setSaveMessage,
    standardDistance,
    standardDistancePoints,
  ]);

  const importAnnotationsFromJSON = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      importAnnotationsFromJSONUseCase({
        event,
        imageNaturalSize,
        setMeasurements,
        setStandardDistance,
        setStandardDistancePoints,
        setSaveMessage,
        calculateMeasurementValue,
        getDescriptionForType,
      });
    },
    [
      calculateMeasurementValue,
      getDescriptionForType,
      imageNaturalSize,
      setMeasurements,
      setSaveMessage,
      setStandardDistance,
      setStandardDistancePoints,
    ]
  );

  return {
    handleAddMeasurement,
    handleMeasurementDelete,
    automaticToolStatus,
    handleRestoreAutomaticMeasurement,
    exportAnnotationsToJSON,
    importAnnotationsFromJSON,
    calculationContext,
  };
}
