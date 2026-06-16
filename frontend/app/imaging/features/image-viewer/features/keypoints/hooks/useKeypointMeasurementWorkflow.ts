import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AnnotationSource,
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  areKeypointsEqual,
  buildDerivedMeasurementsFromLayer,
  createAvtMeasurement,
  createNextBoundCobbMeasurement,
  createTtsMeasurement,
  createVertebraCenterMeasurement,
  deriveKeypointMeasurements as deriveKeypointMeasurementsUseCase,
  deriveInitialMeasurementsFromKeypoints as deriveInitialMeasurementsFromKeypointsUseCase,
  hasCobbMeasurementForEndpoints,
  recalculateExistingMeasurementsFromKeypoints,
  syncUniqueMeasurementsAfterKeypointChange,
} from '@/app/imaging/features/image-viewer/features/keypoints/usecases/keypointMeasurementUseCase';
import { DERIVED_ID_PREFIX } from '@/app/imaging/features/image-viewer/features/keypoints/domain/vertebrae-derive';
import {
  deleteKeypoint,
  getCompleteSelectableVertebraGroups,
  hasKeypoint,
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  markMovedKeypointsManual,
  rectifyVertebraCornerOrder,
  shiftMeasurementVertebraLabels,
  shiftVertebraLabels,
  type VertebraLabelOffsetOptions,
  type VertebraCornerOrderMapping,
  upsertKeypoint,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import { applyMeasurementPointToVertebrae } from '@/app/imaging/features/image-viewer/features/keypoints/domain/measurement-keypoint-writeback';
import { syncCobbMeasurementToKeypoints } from '@/app/imaging/features/image-viewer/features/keypoints/usecases/cobbKeypointSyncUseCase';
import { runLateralDetectionCache } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase';

interface UseKeypointMeasurementWorkflowOptions {
  imageId: string;
  examType: string;
  imageNaturalSize: ImageSize | null;
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  standardDistance: number | null;
  calculationContext: CalculationContext;
  canUseKeypoints: boolean;
  isLateralView: boolean;
  isKeypointExam: boolean;
  setSaveMessage: (message: string) => void;
  setShowStandardDistanceWarning: (value: boolean) => void;
}

export interface LateralDetectionCache {
  vertebrae: VertebraAnnotation[];
  cfh: CfhAnnotation | null;
}

function flashMessage(
  setSaveMessage: (message: string) => void,
  message: string,
  delay = 3000
) {
  setSaveMessage(message);
  setTimeout(() => setSaveMessage(''), delay);
}

export function useKeypointMeasurementWorkflow({
  imageId,
  examType,
  imageNaturalSize,
  measurements,
  setMeasurements,
  standardDistance,
  calculationContext,
  canUseKeypoints,
  isLateralView,
  isKeypointExam,
  setSaveMessage,
  setShowStandardDistanceWarning,
}: UseKeypointMeasurementWorkflowOptions) {
  const [vertebraeLayer, setVertebraeLayer] = useState<VertebraAnnotation[]>(
    []
  );
  const [keypoints, setKeypoints] = useState<KeypointAnnotation[]>([]);
  const [cfhAnnotation, setCfhAnnotation] = useState<CfhAnnotation | null>(
    null
  );
  const [showVertebraeLayer, setShowVertebraeLayer] = useState(false);
  const aiMeasurementIdsRef = useRef<Set<string>>(new Set());
  const lateralDetectionResultRef = useRef<LateralDetectionCache | null>(null);

  const completeVertebraGroups = useMemo(
    () => getCompleteSelectableVertebraGroups(keypoints, examType),
    [examType, keypoints]
  );

  const activeVertebraeLayer = useMemo(
    () =>
      isKeypointExam && keypoints.length > 0
        ? keypointsToPersistedLayer(keypoints)
        : vertebraeLayer,
    [isKeypointExam, keypoints, vertebraeLayer]
  );

  const deriveKeypointMeasurements = useCallback(
    (nextKeypoints: KeypointAnnotation[]): MeasurementData[] =>
      deriveKeypointMeasurementsUseCase({
        keypoints: nextKeypoints,
        cfhAnnotation,
        examType,
        calculationContext,
      }),
    [calculationContext, cfhAnnotation, examType]
  );

  const deriveInitialMeasurementsFromKeypoints = useCallback(
    (
      nextKeypoints: KeypointAnnotation[],
      previousMeasurements: MeasurementData[] = measurements
    ): MeasurementData[] =>
      deriveInitialMeasurementsFromKeypointsUseCase({
        previousMeasurements,
        keypoints: nextKeypoints,
        cfhAnnotation,
        examType,
        isLateralView,
        calculationContext,
        aiMeasurementIds: aiMeasurementIdsRef.current,
      }),
    [calculationContext, cfhAnnotation, examType, isLateralView, measurements]
  );

  const recalculateExistingMeasurements = useCallback(
    (
      previousMeasurements: MeasurementData[],
      nextKeypoints: KeypointAnnotation[]
    ): MeasurementData[] =>
      recalculateExistingMeasurementsFromKeypoints({
        previousMeasurements,
        keypoints: nextKeypoints,
        cfhAnnotation,
        examType,
        isLateralView,
        calculationContext,
        aiMeasurementIds: aiMeasurementIdsRef.current,
      }),
    [calculationContext, cfhAnnotation, examType, isLateralView]
  );

  const syncUniqueMeasurements = useCallback(
    (
      previousMeasurements: MeasurementData[],
      nextKeypoints: KeypointAnnotation[]
    ): MeasurementData[] =>
      syncUniqueMeasurementsAfterKeypointChange({
        previousMeasurements,
        keypoints: nextKeypoints,
        cfhAnnotation,
        examType,
        isLateralView,
        calculationContext,
        aiMeasurementIds: aiMeasurementIdsRef.current,
      }),
    [calculationContext, cfhAnnotation, examType, isLateralView]
  );

  const clearKeypointState = useCallback(() => {
    setVertebraeLayer([]);
    setKeypoints([]);
    setCfhAnnotation(null);
    setShowVertebraeLayer(false);
    aiMeasurementIdsRef.current = new Set();
  }, []);

  const restoreAiMeasurementIds = useCallback((ids: string[]) => {
    aiMeasurementIdsRef.current = new Set(ids);
  }, []);

  const getAiMeasurementIdsSnapshot = useCallback(
    () => Array.from(aiMeasurementIdsRef.current),
    []
  );

  const applyKeypoints = useCallback(
    (nextKeypoints: KeypointAnnotation[]) => {
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous =>
        recalculateExistingMeasurements(previous, nextKeypoints)
      );
    },
    [isLateralView, recalculateExistingMeasurements, setMeasurements]
  );

  useEffect(() => {
    if (!isLateralView || canUseKeypoints || !imageNaturalSize) return;
    void runLateralDetectionCache({ imageId, lateralDetectionResultRef });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageId,
    isLateralView,
    canUseKeypoints,
    imageNaturalSize?.width,
    imageNaturalSize?.height,
  ]);

  useEffect(() => {
    if (!isKeypointExam) return;
    if (vertebraeLayer.length === 0 && !cfhAnnotation) return;

    const restoredKeypoints = vertebraeLayerToKeypoints(
      vertebraeLayer,
      examType,
      cfhAnnotation
    );
    if (restoredKeypoints.length === 0) return;

    setKeypoints(previous =>
      areKeypointsEqual(previous, restoredKeypoints)
        ? previous
        : restoredKeypoints
    );
  }, [cfhAnnotation, examType, isKeypointExam, vertebraeLayer]);

  useEffect(() => {
    if (!isKeypointExam || keypoints.length === 0) return;
    setMeasurements(previous =>
      recalculateExistingMeasurements(previous, keypoints)
    );
  }, [
    isKeypointExam,
    keypoints,
    recalculateExistingMeasurements,
    setMeasurements,
  ]);

  const handleKeypointAdd = useCallback(
    (keypointId: string, point: Point) => {
      if (!isKeypointExam) return;
      if (hasKeypoint(keypoints, keypointId)) {
        flashMessage(setSaveMessage, `${keypointId} 已存在，不能重复添加`);
        return;
      }

      const nextKeypoints = upsertKeypoint(keypoints, {
        id: keypointId,
        point,
        source: AnnotationSource.MANUAL,
        confidence: 1,
      });
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous => syncUniqueMeasurements(previous, nextKeypoints));
      setShowVertebraeLayer(true);
    },
    [
      isKeypointExam,
      isLateralView,
      keypoints,
      setMeasurements,
      setSaveMessage,
      syncUniqueMeasurements,
    ]
  );

  const handleKeypointDelete = useCallback(
    (keypointId: string) => {
      if (!isKeypointExam) return;
      const nextKeypoints = deleteKeypoint(keypoints, keypointId);
      const nextMeasurements = syncUniqueMeasurements(
        measurements,
        nextKeypoints
      );
      const nextMeasurementIds = new Set(
        nextMeasurements.map(measurement => measurement.id)
      );
      const removedMeasurements = measurements.filter(
        measurement => !nextMeasurementIds.has(measurement.id)
      );

      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(nextMeasurements);

      flashMessage(
        setSaveMessage,
        removedMeasurements.length > 0
          ? `已删除 ${keypointId}，并移除 ${removedMeasurements.length} 个关联测量项`
          : `已删除 ${keypointId}`
      );
    },
    [
      isKeypointExam,
      isLateralView,
      keypoints,
      measurements,
      setMeasurements,
      setSaveMessage,
      syncUniqueMeasurements,
    ]
  );

  const handleCreateVertebraCenter = useCallback(
    (vertebra: string) => {
      const measurement = createVertebraCenterMeasurement({
        vertebra,
        keypoints,
        examType,
        isLateralView,
        calculationContext,
      });
      if (!measurement) {
        flashMessage(
          setSaveMessage,
          `缺少 ${vertebra} 的完整关键点，无法创建椎体中心`
        );
        return;
      }
      setMeasurements(previous => {
        if (
          previous.some(
            item =>
              item.type === 'vertebra-center' && item.upperVertebra === vertebra
          )
        ) {
          return previous;
        }
        return [...previous, measurement];
      });
    },
    [
      calculationContext,
      examType,
      isLateralView,
      keypoints,
      setMeasurements,
      setSaveMessage,
    ]
  );

  const handleRectifyVertebraCornerOrder = useCallback(
    (vertebra: string, mapping: VertebraCornerOrderMapping[]) => {
      if (!isKeypointExam) return;

      const result = rectifyVertebraCornerOrder(keypoints, vertebra, mapping);
      if (!result.ok) {
        window.alert(
          `椎体缺少序号${result.missingSequenceNumbers.join(',')}, 请检查您输入的序号!`
        );
        return;
      }

      applyKeypoints(result.keypoints);
      setShowVertebraeLayer(true);
    },
    [applyKeypoints, isKeypointExam, keypoints]
  );

  const handleApplyVertebraLabelOffset = useCallback(
    (options: Omit<VertebraLabelOffsetOptions, 'examType'>) => {
      if (!isKeypointExam) return;

      const result = shiftVertebraLabels(keypoints, {
        ...options,
        examType,
      });
      if (!result.ok) {
        return;
      }

      const nextKeypoints = result.keypoints;
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous =>
        recalculateExistingMeasurements(
          shiftMeasurementVertebraLabels(previous, result.vertebraLabelMap),
          nextKeypoints
        )
      );
      setShowVertebraeLayer(true);
    },
    [
      examType,
      isKeypointExam,
      isLateralView,
      keypoints,
      recalculateExistingMeasurements,
      setMeasurements,
    ]
  );

  const handleCreateTts = useCallback(
    (upperVertebra: string, lowerVertebra: string) => {
      if (!standardDistance) {
        setShowStandardDistanceWarning(true);
        return;
      }
      const measurement = createTtsMeasurement({
        upperVertebra,
        lowerVertebra,
        keypoints,
        calculationContext,
      });
      if (!measurement) {
        flashMessage(setSaveMessage, '缺少 TTS 所需关键点，无法创建');
        return;
      }
      setMeasurements(previous => [
        ...previous.filter(item => item.type.toLowerCase() !== 'tts'),
        measurement,
      ]);
    },
    [
      calculationContext,
      keypoints,
      setMeasurements,
      setSaveMessage,
      setShowStandardDistanceWarning,
      standardDistance,
    ]
  );

  const handleCreateAvt = useCallback(
    (apexVertebra: string) => {
      if (!standardDistance) {
        setShowStandardDistanceWarning(true);
        return;
      }
      const measurement = createAvtMeasurement({
        apexVertebra,
        keypoints,
        calculationContext,
      });
      if (!measurement) {
        flashMessage(setSaveMessage, '缺少 AVT 所需关键点，无法创建');
        return;
      }
      setMeasurements(previous => [
        ...previous.filter(item => getAnnotationTypeId(item.type) !== 'avt'),
        measurement,
      ]);
    },
    [
      calculationContext,
      keypoints,
      setMeasurements,
      setSaveMessage,
      setShowStandardDistanceWarning,
      standardDistance,
    ]
  );

  const handleCreateCobb = useCallback(
    (upperVertebra: string, lowerVertebra: string) => {
      if (upperVertebra === lowerVertebra) return;
      if (
        hasCobbMeasurementForEndpoints(
          measurements,
          upperVertebra,
          lowerVertebra
        )
      ) {
        return;
      }

      const probeMeasurement = createNextBoundCobbMeasurement({
        upperVertebra,
        lowerVertebra,
        keypoints,
        examType,
        calculationContext,
        existingMeasurements: measurements,
      });
      if (!probeMeasurement) {
        flashMessage(
          setSaveMessage,
          `缺少 ${upperVertebra}-${lowerVertebra} 所需关键点，无法创建 Cobb`
        );
        return;
      }

      setMeasurements(previous => {
        if (
          hasCobbMeasurementForEndpoints(
            previous,
            upperVertebra,
            lowerVertebra
          )
        ) {
          return previous;
        }

        const measurement = createNextBoundCobbMeasurement({
          upperVertebra,
          lowerVertebra,
          keypoints,
          examType,
          calculationContext,
          existingMeasurements: previous,
        });

        return measurement ? [...previous, measurement] : previous;
      });
    },
    [
      calculationContext,
      examType,
      keypoints,
      measurements,
      setMeasurements,
      setSaveMessage,
    ]
  );

  const handleVertebraeUpdate = useCallback(
    (updated: VertebraAnnotation[]) => {
      if (isKeypointExam) {
        const nextKeypoints = markMovedKeypointsManual(
          keypoints,
          vertebraeLayerToKeypoints(updated, examType)
        );
        applyKeypoints(nextKeypoints);
        return;
      }
      setVertebraeLayer(updated);
      const derivedWithValues = buildDerivedMeasurementsFromLayer({
        layer: updated,
        cfhAnnotation,
        examType,
        calculationContext,
      });
      setMeasurements(previous => [
        ...previous.filter(
          measurement =>
            !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
            !aiMeasurementIdsRef.current.has(measurement.id)
        ),
        ...derivedWithValues,
      ]);
    },
    [
      applyKeypoints,
      calculationContext,
      cfhAnnotation,
      examType,
      isKeypointExam,
      keypoints,
      setMeasurements,
    ]
  );

  const handleVertebraePreviewUpdate = useCallback(
    (updated: VertebraAnnotation[]) => {
      if (!isKeypointExam) return;
      const nextKeypoints = vertebraeLayerToKeypoints(updated, examType);
      setMeasurements(previous =>
        recalculateExistingMeasurements(previous, nextKeypoints)
      );
    },
    [examType, isKeypointExam, recalculateExistingMeasurements, setMeasurements]
  );

  const handleMeasurementWriteback = useCallback(
    (
      measurementType: string,
      pointIndex: number,
      newPoint: Point,
      measurementId?: string
    ) => {
      const sourceMeasurement = measurementId
        ? measurements.find(measurement => measurement.id === measurementId)
        : null;
      const dynamicVertebraLabel = sourceMeasurement?.apexVertebra ?? undefined;

      const { vertebraeLayer: nextLayer, cfhAnnotation: nextCfh } =
        applyMeasurementPointToVertebrae(
          activeVertebraeLayer,
          cfhAnnotation,
          measurementType,
          pointIndex,
          newPoint,
          dynamicVertebraLabel
        );
      if (nextLayer !== activeVertebraeLayer) {
        setVertebraeLayer(nextLayer);
        if (isKeypointExam) {
          setKeypoints(vertebraeLayerToKeypoints(nextLayer, examType));
        }
      }
      if (nextCfh !== cfhAnnotation) {
        setCfhAnnotation(nextCfh);
      }
    },
    [
      activeVertebraeLayer,
      cfhAnnotation,
      examType,
      isKeypointExam,
      measurements,
    ]
  );

  const handleCobbKeypointsSync = useCallback(
    (measurementId: string) => {
      if (!isKeypointExam) return;
      const measurement = measurements.find(item => item.id === measurementId);
      if (!measurement) return;

      const nextKeypoints = syncCobbMeasurementToKeypoints(
        keypoints,
        measurement,
        examType
      );
      if (!nextKeypoints) {
        flashMessage(setSaveMessage, '请先填写 Cobb 上下端椎');
        return;
      }

      const upperVertebra = measurement.upperVertebra!.trim().toUpperCase();
      const lowerVertebra = measurement.lowerVertebra!.trim().toUpperCase();
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      setMeasurements(previous =>
        recalculateExistingMeasurements(
          previous.map(item =>
            item.id === measurementId
              ? {
                  ...item,
                  upperVertebra,
                  lowerVertebra,
                  keypointSynced: true,
                }
              : item
          ),
          nextKeypoints
        )
      );
      setShowVertebraeLayer(true);
      flashMessage(setSaveMessage, '已同步 Cobb 端椎到检测层');
    },
    [
      examType,
      isKeypointExam,
      keypoints,
      measurements,
      recalculateExistingMeasurements,
      setSaveMessage,
      setMeasurements,
    ]
  );

  const handleToggleVertebraeLayer = useCallback(() => {
    setShowVertebraeLayer(current => {
      const next = !current;
      if (!next && activeVertebraeLayer.length > 0) {
        if (isKeypointExam) {
          // 关闭检测层时只结算仍保留/绑定的测量项，不再从关键点新增测量项。
          setMeasurements(previous =>
            recalculateExistingMeasurements(previous, keypoints)
          );
        } else {
          const derivedWithValues = buildDerivedMeasurementsFromLayer({
            layer: activeVertebraeLayer,
            cfhAnnotation,
            examType,
            calculationContext,
          });
          setMeasurements(previous => [
            ...previous.filter(
              measurement =>
                !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
                !aiMeasurementIdsRef.current.has(measurement.id)
            ),
            ...derivedWithValues,
          ]);
        }
      }
      return next;
    });
  }, [
    activeVertebraeLayer,
    calculationContext,
    cfhAnnotation,
    examType,
    isKeypointExam,
    keypoints,
    recalculateExistingMeasurements,
    setMeasurements,
  ]);

  return {
    vertebraeLayer,
    setVertebraeLayer,
    keypoints,
    setKeypoints,
    cfhAnnotation,
    setCfhAnnotation,
    showVertebraeLayer,
    setShowVertebraeLayer,
    activeVertebraeLayer,
    completeVertebraGroups,
    aiMeasurementIdsRef: aiMeasurementIdsRef as MutableRefObject<Set<string>>,
    lateralDetectionResultRef:
      lateralDetectionResultRef as MutableRefObject<LateralDetectionCache | null>,
    deriveInitialMeasurementsFromKeypoints,
    deriveKeypointMeasurements,
    recalculateExistingMeasurements,
    syncUniqueMeasurements,
    clearKeypointState,
    restoreAiMeasurementIds,
    getAiMeasurementIdsSnapshot,
    handleKeypointAdd,
    handleKeypointDelete,
    handleCreateVertebraCenter,
    handleCreateCobb,
    handleRectifyVertebraCornerOrder,
    handleApplyVertebraLabelOffset,
    handleCreateTts,
    handleCreateAvt,
    handleVertebraeUpdate,
    handleVertebraePreviewUpdate,
    handleMeasurementWriteback,
    handleCobbKeypointsSync,
    handleToggleVertebraeLayer,
  };
}
