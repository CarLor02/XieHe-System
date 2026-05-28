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
  createTtsMeasurement,
  createVertebraCenterMeasurement,
  deriveKeypointMeasurements as deriveKeypointMeasurementsUseCase,
  rebuildKeypointMeasurements as rebuildKeypointMeasurementsUseCase,
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

  const rebuildKeypointMeasurements = useCallback(
    (
      previousMeasurements: MeasurementData[],
      nextKeypoints: KeypointAnnotation[]
    ): MeasurementData[] =>
      rebuildKeypointMeasurementsUseCase({
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

  const applyKeypoints = useCallback(
    (nextKeypoints: KeypointAnnotation[]) => {
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous =>
        rebuildKeypointMeasurements(previous, nextKeypoints)
      );
    },
    [isLateralView, rebuildKeypointMeasurements, setMeasurements]
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
      rebuildKeypointMeasurements(previous, keypoints)
    );
  }, [isKeypointExam, keypoints, rebuildKeypointMeasurements, setMeasurements]);

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
      applyKeypoints(nextKeypoints);
      setShowVertebraeLayer(true);
    },
    [applyKeypoints, isKeypointExam, keypoints, setSaveMessage]
  );

  const handleKeypointDelete = useCallback(
    (keypointId: string) => {
      if (!isKeypointExam) return;
      const nextKeypoints = deleteKeypoint(keypoints, keypointId);
      const nextMeasurements = rebuildKeypointMeasurements(
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
      rebuildKeypointMeasurements,
      setMeasurements,
      setSaveMessage,
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
        rebuildKeypointMeasurements(previous, nextKeypoints)
      );
    },
    [examType, isKeypointExam, rebuildKeypointMeasurements, setMeasurements]
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
        measurement
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
        rebuildKeypointMeasurements(
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
      isKeypointExam,
      keypoints,
      measurements,
      rebuildKeypointMeasurements,
      setSaveMessage,
      setMeasurements,
    ]
  );

  const handleToggleVertebraeLayer = useCallback(() => {
    setShowVertebraeLayer(current => {
      const next = !current;
      if (!next && activeVertebraeLayer.length > 0) {
        if (isKeypointExam) {
          setMeasurements(previous =>
            rebuildKeypointMeasurements(previous, keypoints)
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
    rebuildKeypointMeasurements,
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
    deriveKeypointMeasurements,
    rebuildKeypointMeasurements,
    clearKeypointState,
    handleKeypointAdd,
    handleKeypointDelete,
    handleCreateVertebraCenter,
    handleCreateTts,
    handleCreateAvt,
    handleVertebraeUpdate,
    handleVertebraePreviewUpdate,
    handleMeasurementWriteback,
    handleCobbKeypointsSync,
    handleToggleVertebraeLayer,
  };
}
