import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  AnnotationSource,
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import {
  buildDerivedMeasurementsFromLayer,
  deriveInitialMeasurementsFromKeypoints as deriveInitialMeasurementsFromKeypointsUseCase,
  recalculateExistingMeasurementsFromKeypoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/synchronizeMeasurementsUseCase';
import {
  createAvtMeasurement,
  createNextBoundCobbMeasurement,
  createTtsMeasurement,
  createVertebraCenterMeasurement,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/createBoundMeasurementUseCase';
import {
  hasAvtMeasurementForTarget,
  hasCobbMeasurementForEndpoints,
  isCobbMeasurement,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-query';
import {
  createAvtPlacementSession,
  type AvtPlacementSession,
  type AvtTarget,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/avt';
import { DERIVED_ID_PREFIX } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/vertebrae-derive';
import {
  areKeypointsEqual,
  hasKeypoint,
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
  markMovedKeypointsManual,
  rectifyVertebraCornerOrder,
  shiftVertebraLabels,
  type VertebraLabelOffsetOptions,
  type VertebraCornerOrderMapping,
  upsertKeypoint,
  useKeypointLayerState,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { shiftMeasurementVertebraLabels } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/shiftMeasurementVertebraLabelsUseCase';
import { applyMeasurementPointToVertebrae } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-writeback';
import {
  getMeasurementKeypointBindingRule,
  getMeasurementKeypointBindingRuleForMeasurement,
  writeMeasurementToKeypoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-binding';
import { syncCobbMeasurementToKeypoints } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/cobbKeypointSyncUseCase';
import { runLateralDetectionCache } from '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase';
import {
  hydratePersistedKeypointState,
  type PersistedKeypointStateInput,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/hydratePersistedKeypointStateUseCase';
import { useAnnotationDeletionWorkflow } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/hooks/useAnnotationDeletionWorkflow';
import { deriveMissingFixedMeasurementsFromKeypoints } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/deriveMissingFixedMeasurementsUseCase';

interface UseMeasurementKeypointWorkflowOptions {
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

function getKeypointIdsForLabelGroup(
  keypoints: KeypointAnnotation[],
  label: string
): string[] {
  const groupPrefix = `${label}-`;
  return keypoints
    .filter(
      keypoint => keypoint.id === label || keypoint.id.startsWith(groupPrefix)
    )
    .map(keypoint => keypoint.id);
}

export function useMeasurementKeypointWorkflow({
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
}: UseMeasurementKeypointWorkflowOptions) {
  const {
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
    clearKeypointLayer,
  } = useKeypointLayerState({ examType, isKeypointExam });
  const aiMeasurementIdsRef = useRef<Set<string>>(new Set());
  const lateralDetectionResultRef = useRef<LateralDetectionCache | null>(null);

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

  const deriveMissingFixedMeasurements = useCallback(
    (
      previousMeasurements: MeasurementData[],
      nextKeypoints: KeypointAnnotation[]
    ): MeasurementData[] =>
      deriveMissingFixedMeasurementsFromKeypoints({
        previousMeasurements,
        keypoints: nextKeypoints,
        examType,
        calculationContext,
      }),
    [calculationContext, examType]
  );

  const annotationDeletion = useAnnotationDeletionWorkflow({
    examType,
    measurements,
    setMeasurements,
    keypoints,
    setKeypoints,
    setVertebraeLayer,
    isLateralView,
    setCfhAnnotation,
    calculationContext,
    aiMeasurementIdsRef,
  });

  const clearKeypointState = useCallback(() => {
    clearKeypointLayer();
    aiMeasurementIdsRef.current = new Set();
  }, [clearKeypointLayer]);

  const restoreAiMeasurementIds = useCallback((ids: string[]) => {
    aiMeasurementIdsRef.current = new Set(ids);
  }, []);

  const getAiMeasurementIdsSnapshot = useCallback(
    () => Array.from(aiMeasurementIdsRef.current),
    []
  );

  /** 拖动/预览只更新点位并重算已有测量项，禁止恢复缺失测量项。 */
  const applyMovedKeypoints = useCallback(
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
    [
      isLateralView,
      recalculateExistingMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
    ]
  );

  /** 显式确认关键点后，重算已有项并补齐所有当前可确定的固定测量项。 */
  const applyConfirmedKeypoints = useCallback(
    (nextKeypoints: KeypointAnnotation[]) => {
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous =>
        deriveMissingFixedMeasurements(
          recalculateExistingMeasurements(previous, nextKeypoints),
          nextKeypoints
        )
      );
    },
    [
      deriveMissingFixedMeasurements,
      isLateralView,
      recalculateExistingMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
    ]
  );

  const restoreFixedMeasurementsFromKeypoints = useCallback(() => {
    setMeasurements(previous =>
      deriveMissingFixedMeasurements(
        recalculateExistingMeasurements(previous, keypoints),
        keypoints
      )
    );
  }, [
    deriveMissingFixedMeasurements,
    keypoints,
    recalculateExistingMeasurements,
    setMeasurements,
  ]);

  const restorePersistedKeypointState = useCallback(
    (input: PersistedKeypointStateInput) => {
      const restored = hydratePersistedKeypointState(input);
      setKeypoints(restored.keypoints);
      setVertebraeLayer(restored.vertebraeLayer);
      setCfhAnnotation(restored.cfhAnnotation);
    },
    [setCfhAnnotation, setKeypoints, setVertebraeLayer]
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
  }, [cfhAnnotation, examType, isKeypointExam, setKeypoints, vertebraeLayer]);

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
      applyConfirmedKeypoints(nextKeypoints);
      setShowVertebraeLayer(true);
    },
    [
      isKeypointExam,
      keypoints,
      applyConfirmedKeypoints,
      setSaveMessage,
      setShowVertebraeLayer,
    ]
  );

  const handleKeypointDelete = useCallback(
    (keypointId: string) => {
      if (!isKeypointExam) return;
      const result = annotationDeletion.deleteSelectedKeypoints([keypointId]);

      flashMessage(
        setSaveMessage,
        result.removedMeasurementCount > 0
          ? `已删除 ${keypointId}，并移除 ${result.removedMeasurementCount} 个关联测量项`
          : `已删除 ${keypointId}`
      );
    },
    [annotationDeletion, isKeypointExam, setSaveMessage]
  );

  const handleKeypointGroupDelete = useCallback(
    (label: string) => {
      if (!isKeypointExam) return;
      const keypointIds = getKeypointIdsForLabelGroup(keypoints, label);
      if (keypointIds.length === 0) return;
      const result = annotationDeletion.deleteSelectedKeypoints(keypointIds);

      flashMessage(
        setSaveMessage,
        result.removedMeasurementCount > 0
          ? `已删除 ${label} 的 ${keypointIds.length} 个关键点，并移除 ${result.removedMeasurementCount} 个关联测量项`
          : `已删除 ${label} 的 ${keypointIds.length} 个关键点`
      );
    },
    [annotationDeletion, isKeypointExam, keypoints, setSaveMessage]
  );

  const handleMeasurementDelete = useCallback(
    (measurementId: string) => {
      annotationDeletion.deleteMeasurement(measurementId);
    },
    [annotationDeletion]
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

      applyConfirmedKeypoints(result.keypoints);
      setShowVertebraeLayer(true);
    },
    [applyConfirmedKeypoints, isKeypointExam, keypoints, setShowVertebraeLayer]
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
      setMeasurements(previous => {
        const recalculated = recalculateExistingMeasurements(
          shiftMeasurementVertebraLabels(previous, result.vertebraLabelMap),
          nextKeypoints
        );
        return deriveMissingFixedMeasurements(recalculated, nextKeypoints);
      });
      setShowVertebraeLayer(true);
    },
    [
      examType,
      isKeypointExam,
      isLateralView,
      keypoints,
      deriveMissingFixedMeasurements,
      recalculateExistingMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setShowVertebraeLayer,
      setVertebraeLayer,
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
    (target: AvtTarget, discAnchors?: readonly [Point, Point]) => {
      if (!standardDistance) {
        setShowStandardDistanceWarning(true);
        return false;
      }
      const measurement = createAvtMeasurement({
        target,
        keypoints,
        calculationContext,
        discAnchors,
      });
      if (!measurement) {
        flashMessage(setSaveMessage, '缺少 AVT 所需关键点，无法创建');
        return false;
      }
      setMeasurements(previous => {
        return hasAvtMeasurementForTarget(previous, target)
          ? previous
          : [...previous, measurement];
      });
      return true;
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

  const handleAddAvtKeypoint = useCallback(
    (
      target: AvtTarget,
      keypointId: string,
      point: Point
    ): AvtPlacementSession | null => {
      if (!isKeypointExam || hasKeypoint(keypoints, keypointId)) {
        return createAvtPlacementSession(
          target,
          new Set(keypoints.map(keypoint => keypoint.id))
        );
      }

      const nextKeypoints = upsertKeypoint(keypoints, {
        id: keypointId,
        point,
        source: AnnotationSource.MANUAL,
        confidence: 1,
      });
      const nextSession = createAvtPlacementSession(
        target,
        new Set(nextKeypoints.map(keypoint => keypoint.id))
      );
      const completedMeasurement =
        nextSession === null
          ? createAvtMeasurement({
              target,
              keypoints: nextKeypoints,
              calculationContext,
            })
          : null;

      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      setMeasurements(previous => {
        const synchronized = deriveMissingFixedMeasurements(
          recalculateExistingMeasurements(
            previous,
            nextKeypoints
          ),
          nextKeypoints
        );
        if (
          !completedMeasurement ||
          hasAvtMeasurementForTarget(synchronized, target)
        ) {
          return synchronized;
        }
        return [...synchronized, completedMeasurement];
      });
      setShowVertebraeLayer(true);
      return nextSession;
    },
    [
      calculationContext,
      deriveMissingFixedMeasurements,
      isKeypointExam,
      keypoints,
      setKeypoints,
      setMeasurements,
      setShowVertebraeLayer,
      setVertebraeLayer,
      recalculateExistingMeasurements,
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
          hasCobbMeasurementForEndpoints(previous, upperVertebra, lowerVertebra)
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
        applyMovedKeypoints(nextKeypoints);
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
      applyMovedKeypoints,
      calculationContext,
      cfhAnnotation,
      examType,
      isKeypointExam,
      keypoints,
      setMeasurements,
      setVertebraeLayer,
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
      pointIndex: number | readonly number[],
      newPoint: Point,
      measurementId?: string,
      updatedPoints?: Point[]
    ) => {
      const sourceMeasurement = measurementId
        ? measurements.find(measurement => measurement.id === measurementId)
        : null;
      const dynamicVertebraLabel = sourceMeasurement?.apexVertebra ?? undefined;
      const bindingRule = sourceMeasurement
        ? getMeasurementKeypointBindingRuleForMeasurement(sourceMeasurement)
        : getMeasurementKeypointBindingRule(measurementType);

      if (bindingRule && sourceMeasurement) {
        const changedPointIndices =
          typeof pointIndex === 'number' ? [pointIndex] : [...pointIndex];
        const measurementPoints =
          updatedPoints ??
          sourceMeasurement.points.map((point, index) =>
            changedPointIndices.includes(index) ? newPoint : point
          );
        const nextKeypoints = changedPointIndices.reduce(
          (current, changedPointIndex) =>
            writeMeasurementToKeypoints(
              current,
              sourceMeasurement,
              measurementPoints,
              changedPointIndex
            ),
          keypoints
        );
        if (!areKeypointsEqual(keypoints, nextKeypoints)) {
          applyMovedKeypoints(nextKeypoints);
        }
        return;
      }

      const changedPointIndices =
        typeof pointIndex === 'number' ? [pointIndex] : [...pointIndex];
      const fallbackResult = changedPointIndices.reduce(
        (current, changedPointIndex) =>
          applyMeasurementPointToVertebrae(
            current.vertebraeLayer,
            current.cfhAnnotation,
            measurementType,
            changedPointIndex,
            updatedPoints?.[changedPointIndex] ?? newPoint,
            dynamicVertebraLabel
          ),
        {
          vertebraeLayer: activeVertebraeLayer,
          cfhAnnotation,
        }
      );
      const { vertebraeLayer: nextLayer, cfhAnnotation: nextCfh } =
        fallbackResult;
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
      applyMovedKeypoints,
      cfhAnnotation,
      examType,
      isKeypointExam,
      keypoints,
      measurements,
      setCfhAnnotation,
      setKeypoints,
      setVertebraeLayer,
    ]
  );

  const handleCobbEndpointUpdate = useCallback(
    (
      measurementId: string,
      updates: Partial<MeasurementData>
    ): boolean => {
      const measurement = measurements.find(item => item.id === measurementId);
      const updatesEndpoint =
        Object.prototype.hasOwnProperty.call(updates, 'upperVertebra') ||
        Object.prototype.hasOwnProperty.call(updates, 'lowerVertebra');
      if (!measurement || !updatesEndpoint || !isCobbMeasurement(measurement)) {
        return false;
      }

      const updatedMeasurement = { ...measurement, ...updates };
      if (!isKeypointExam) {
        setMeasurements(previous =>
          previous.map(item =>
            item.id === measurementId ? updatedMeasurement : item
          )
        );
        return true;
      }

      const nextKeypoints = syncCobbMeasurementToKeypoints(
        keypoints,
        updatedMeasurement,
        examType
      );
      if (!nextKeypoints) {
        setMeasurements(previous =>
          previous.map(item =>
            item.id === measurementId ? updatedMeasurement : item
          )
        );
        return true;
      }

      const upperVertebra = updatedMeasurement.upperVertebra!
        .trim()
        .toUpperCase();
      const lowerVertebra = updatedMeasurement.lowerVertebra!
        .trim()
        .toUpperCase();
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }
      setMeasurements(previous => {
        const recalculated = recalculateExistingMeasurements(
          previous.map(item =>
            item.id === measurementId
              ? {
                  ...updatedMeasurement,
                  upperVertebra,
                  lowerVertebra,
                  keypointSynced: true,
                }
              : item
          ),
          nextKeypoints
        );
        return deriveMissingFixedMeasurements(recalculated, nextKeypoints);
      });
      return true;
    },
    [
      examType,
      deriveMissingFixedMeasurements,
      isKeypointExam,
      isLateralView,
      keypoints,
      measurements,
      recalculateExistingMeasurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
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
    setShowVertebraeLayer,
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
    recalculateExistingMeasurements,
    restoreFixedMeasurementsFromKeypoints,
    restorePersistedKeypointState,
    clearKeypointState,
    restoreAiMeasurementIds,
    getAiMeasurementIdsSnapshot,
    handleKeypointAdd,
    handleKeypointDelete,
    handleKeypointGroupDelete,
    handleMeasurementDelete,
    handleCreateVertebraCenter,
    handleCreateCobb,
    handleRectifyVertebraCornerOrder,
    handleApplyVertebraLabelOffset,
    handleCreateTts,
    handleCreateAvt,
    handleAddAvtKeypoint,
    handleVertebraeUpdate,
    handleVertebraePreviewUpdate,
    handleMeasurementWriteback,
    handleCobbEndpointUpdate,
    handleToggleVertebraeLayer,
  };
}
