import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@/lib/api';
import { createEmptyBindings } from '@/app/imaging/features/image-viewer/features/bindings';
import { useAnnotationEngine } from '@/app/imaging/features/image-viewer/features/bindings';
import { useCanvasInteraction } from '@/app/imaging/features/image-viewer/features/annotation-canvas';
import { getToolsForExamType as getTools } from '@/app/imaging/features/image-viewer/features/measurements/catalog/exam-tool-catalog';
import {
  useAnnotationPersistence,
  useLocalAnnotationsDataLoader,
  useMeasurementCalculation,
  useMeasurementWorkflow,
  useMeasurements,
  useStandardDistanceActions,
} from '@/app/imaging/features/image-viewer/features/measurements';
import {
  canExportAnnotationsJson,
  canUseKeypointTools,
  useImageListFetcher,
  useImageStudy,
  useStudyDataLoader,
  useStudyHeaderActions,
} from '@/app/imaging/features/image-viewer/features/study';
import { useReportActions } from '@/app/imaging/features/image-viewer/features/report';
import { AnnotationBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { useAnnotationHistory } from '@/app/imaging/features/image-viewer/application/hooks/useAnnotationHistory';
import {
  isAnteriorExamType,
  isKeypointSupportedExamType,
  isLateralExamType,
  useKeypointMeasurementWorkflow,
} from '@/app/imaging/features/image-viewer/features/keypoints';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

interface UseImageViewerControllerOptions {
  imageId: string;
}

interface AnnotationHistorySnapshot {
  measurements: MeasurementData[];
  standardDistance: number | null;
  standardDistanceValue: string;
  standardDistancePoints: Point[];
  pointBindings: AnnotationBindings;
  keypoints: KeypointAnnotation[];
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  aiMeasurementIds: string[];
}

export function useImageViewerController({
  imageId,
}: UseImageViewerControllerOptions) {
  const { user } = useUser();
  const measurementsState = useMeasurements();
  const canvasState = useCanvasInteraction();
  const { saveMessage, setSaveMessage } = useAnnotationPersistence();
  const studyState = useImageStudy();

  const {
    measurements,
    setMeasurements,
    reportText,
    setReportText,
    standardDistance,
    setStandardDistance,
    standardDistanceValue,
    setStandardDistanceValue,
    standardDistancePoints,
    setStandardDistancePoints,
    hoveredStandardPointIndex,
    setHoveredStandardPointIndex,
    draggingStandardPointIndex,
    setDraggingStandardPointIndex,
    tags,
    setTags,
    newTag,
    setNewTag,
    showTagPanel,
    setShowTagPanel,
    treatmentAdvice,
    setTreatmentAdvice,
    showAdvicePanel,
    setShowAdvicePanel,
    recalculateAVTandTS,
  } = measurementsState;

  const {
    selectedTool,
    setSelectedTool,
    handleToolChange,
    activateHandMode,
    clickedPoints,
    setClickedPoints,
    isSettingStandardDistance,
    setIsSettingStandardDistance,
    showStandardDistanceWarning,
    setShowStandardDistanceWarning,
    isImagePanLocked,
    setIsImagePanLocked,
  } = canvasState;

  const {
    studyData,
    setStudyData,
    studyLoading,
    setStudyLoading,
    imageList,
    setImageList,
    imageNaturalSize,
    setImageNaturalSize,
  } = studyState;

  const imageData = useMemo(
    () =>
      studyData
        ? {
            id: imageId,
            patientName: studyData.patient_name,
            patientId: studyData.patient_id
              ? studyData.patient_id.toString()
              : '0',
            examType: studyData.study_description || studyData.modality,
            studyDate: studyData.study_date,
            captureTime: studyData.created_at,
            seriesCount: 120,
            status: 'pending' as const,
          }
        : {
            id: imageId,
            patientName: '加载中...',
            patientId: '...',
            examType: '加载中...',
            studyDate: '...',
            captureTime: '...',
            seriesCount: 0,
            status: 'pending' as const,
          },
    [imageId, studyData]
  );

  const tools = useMemo(() => getTools(imageData.examType), [imageData.examType]);
  const canExportJson = useMemo(
    () => canExportAnnotationsJson(user),
    [user]
  );
  const canUseKeypoints = canUseKeypointTools();
  const isAnteriorView = isAnteriorExamType(imageData.examType);
  const isLateralView = isLateralExamType(imageData.examType);
  const isKeypointExam = isKeypointSupportedExamType(imageData.examType);

  const {
    calculationContext,
    calculateMeasurementValue,
    getDescriptionForType,
  } = useMeasurementCalculation({
    standardDistance,
    standardDistancePoints,
    imageNaturalSize,
  });

  const keypointWorkflow = useKeypointMeasurementWorkflow({
    imageId,
    examType: imageData.examType,
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
  });
  const {
    keypoints: historyKeypoints,
    setKeypoints: setHistoryKeypoints,
    vertebraeLayer: historyVertebraeLayer,
    setVertebraeLayer: setHistoryVertebraeLayer,
    cfhAnnotation: historyCfhAnnotation,
    setCfhAnnotation: setHistoryCfhAnnotation,
    getAiMeasurementIdsSnapshot,
    restoreAiMeasurementIds,
  } = keypointWorkflow;

  const {
    pointBindings,
    setPointBindings,
    selectedBindingGroupId,
    setSelectedBindingGroupId,
    isBindingPanelOpen,
    setIsBindingPanelOpen,
    centerOnPoint,
    setCenterOnPoint,
    isManualBindingMode,
    setIsManualBindingMode,
    manualBindingSelectedPoints,
    setManualBindingSelectedPoints,
    clearBindings,
    removeBindingGroup,
    removeBindingMember,
    toggleManualBindingPoint,
    completeManualBinding,
    cancelManualBinding,
  } = useAnnotationEngine({
    measurements,
    setMeasurements,
  });

  const dbAnnotationLoadedRef = useRef(false);

  useStudyDataLoader(
    imageId,
    setStudyData,
    setStudyLoading,
    setMeasurements,
    setStandardDistance,
    setStandardDistancePoints,
    setPointBindings,
    dbAnnotationLoadedRef,
    keypointWorkflow.setVertebraeLayer,
    keypointWorkflow.setCfhAnnotation
  );

  useLocalAnnotationsDataLoader(
    imageId,
    imageNaturalSize,
    setMeasurements,
    standardDistance,
    setStandardDistance,
    standardDistancePoints,
    setStandardDistancePoints,
    setPointBindings,
    dbAnnotationLoadedRef,
    calculateMeasurementValue,
    getDescriptionForType,
    keypointWorkflow.setVertebraeLayer,
    keypointWorkflow.setCfhAnnotation
  );

  useImageListFetcher(setImageList);

  const annotationHistorySnapshot = useMemo<AnnotationHistorySnapshot>(
    () => ({
      measurements,
      standardDistance,
      standardDistanceValue,
      standardDistancePoints,
      pointBindings,
      keypoints: historyKeypoints,
      vertebraeLayer: historyVertebraeLayer,
      cfhAnnotation: historyCfhAnnotation,
      aiMeasurementIds: getAiMeasurementIdsSnapshot(),
    }),
    [
      measurements,
      pointBindings,
      standardDistance,
      standardDistancePoints,
      standardDistanceValue,
      historyKeypoints,
      historyVertebraeLayer,
      historyCfhAnnotation,
      getAiMeasurementIdsSnapshot,
    ]
  );

  const restoreAnnotationHistorySnapshot = useCallback(
    (snapshot: AnnotationHistorySnapshot) => {
      setMeasurements(snapshot.measurements);
      setStandardDistance(snapshot.standardDistance);
      setStandardDistanceValue(snapshot.standardDistanceValue);
      setStandardDistancePoints(snapshot.standardDistancePoints);
      setPointBindings(snapshot.pointBindings);
      setHistoryKeypoints(snapshot.keypoints);
      setHistoryVertebraeLayer(snapshot.vertebraeLayer);
      setHistoryCfhAnnotation(snapshot.cfhAnnotation);
      restoreAiMeasurementIds(snapshot.aiMeasurementIds);
      setClickedPoints([]);
    },
    [
      restoreAiMeasurementIds,
      setClickedPoints,
      setHistoryCfhAnnotation,
      setHistoryKeypoints,
      setHistoryVertebraeLayer,
      setMeasurements,
      setPointBindings,
      setStandardDistance,
      setStandardDistancePoints,
      setStandardDistanceValue,
    ]
  );

  const {
    beginHistoryAction,
    clearHistory,
    undo: undoAnnotationHistory,
    canUndo: canUndoAnnotationHistory,
  } = useAnnotationHistory<AnnotationHistorySnapshot>({
    snapshot: annotationHistorySnapshot,
    restoreSnapshot: restoreAnnotationHistorySnapshot,
  });

  useEffect(() => {
    clearHistory();
  }, [clearHistory, imageId]);

  const measurementWorkflow = useMeasurementWorkflow({
    imageId,
    examType: imageData.examType,
    canExportJson,
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
    keypoints: keypointWorkflow.keypoints,
    setKeypoints: keypointWorkflow.setKeypoints,
    activeVertebraeLayer: keypointWorkflow.activeVertebraeLayer,
    setVertebraeLayer: keypointWorkflow.setVertebraeLayer,
    cfhAnnotation: keypointWorkflow.cfhAnnotation,
    setCfhAnnotation: keypointWorkflow.setCfhAnnotation,
    syncUniqueKeypointMeasurements: keypointWorkflow.syncUniqueMeasurements,
    deriveKeypointMeasurements: keypointWorkflow.deriveKeypointMeasurements,
  });

  const standardDistanceActions = useStandardDistanceActions({
    standardDistance,
    standardDistanceValue,
    standardDistancePoints,
    imageNaturalSize,
    isSettingStandardDistance,
    setShowStandardDistanceWarning,
    setSelectedTool,
    handleToolChange,
    setIsSettingStandardDistance,
    setStandardDistancePoints,
    setStandardDistance,
    recalculateAVTandTS,
  });

  const studyHeaderActions = useStudyHeaderActions({
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
    activeVertebraeLayer: keypointWorkflow.activeVertebraeLayer,
    cfhAnnotation: keypointWorkflow.cfhAnnotation,
    canUseKeypoints,
    isLateralView,
    setVertebraeLayer: keypointWorkflow.setVertebraeLayer,
    setKeypoints: keypointWorkflow.setKeypoints,
    setShowVertebraeLayer: keypointWorkflow.setShowVertebraeLayer,
    setCfhAnnotation: keypointWorkflow.setCfhAnnotation,
    deriveInitialMeasurementsFromKeypoints:
      keypointWorkflow.deriveInitialMeasurementsFromKeypoints,
    lateralDetectionResultRef: keypointWorkflow.lateralDetectionResultRef,
    aiMeasurementIdsRef: keypointWorkflow.aiMeasurementIdsRef,
    setSaveMessage,
  });

  const handleMeasurementAddWithHistory = useCallback(
    (toolType: string, points: Point[]) => {
      beginHistoryAction('manual-measurement');
      measurementWorkflow.handleAddMeasurement(toolType, points);
    },
    [beginHistoryAction, measurementWorkflow]
  );

  const handleKeypointAddWithHistory = useCallback(
    (keypointId: string, point: Point) => {
      beginHistoryAction('manual-keypoint');
      keypointWorkflow.handleKeypointAdd(keypointId, point);
    },
    [beginHistoryAction, keypointWorkflow]
  );

  const handleMeasurementDeleteWithHistory = useCallback(
    (measurementId: string) => {
      beginHistoryAction('measurement-delete');
      measurementWorkflow.handleMeasurementDelete(measurementId);
    },
    [beginHistoryAction, measurementWorkflow]
  );

  const handleKeypointDeleteWithHistory = useCallback(
    (keypointId: string) => {
      beginHistoryAction('keypoint-delete');
      keypointWorkflow.handleKeypointDelete(keypointId);
    },
    [beginHistoryAction, keypointWorkflow]
  );

  const handleMeasurementUpdateWithHistory = useCallback(
    (measurementId: string, updates: Partial<MeasurementData>) => {
      beginHistoryAction('measurement-update');
      setMeasurements(previous =>
        previous.map(measurement =>
          measurement.id === measurementId
            ? { ...measurement, ...updates }
            : measurement
        )
      );
    },
    [beginHistoryAction, setMeasurements]
  );

  const handleRectifyVertebraCornerOrderWithHistory = useCallback(
    (
      vertebra: string,
      mapping: Parameters<
        typeof keypointWorkflow.handleRectifyVertebraCornerOrder
      >[1]
    ) => {
      beginHistoryAction('vertebra-corner-rectify');
      keypointWorkflow.handleRectifyVertebraCornerOrder(vertebra, mapping);
    },
    [beginHistoryAction, keypointWorkflow]
  );

  const handleCreateCobbWithHistory = useCallback(
    (upperVertebra: string, lowerVertebra: string) => {
      beginHistoryAction('measurement-derive-cobb');
      keypointWorkflow.handleCreateCobb(upperVertebra, lowerVertebra);
    },
    [beginHistoryAction, keypointWorkflow]
  );

  const handleAIMeasurementWithHistory = useCallback(() => {
    beginHistoryAction('ai-measurement', {
      persistAcrossUnchangedRenders: true,
    });
    studyHeaderActions.handleAIMeasurement();
  }, [beginHistoryAction, studyHeaderActions]);

  const handleAnnotationDataDragStart = useCallback(() => {
    beginHistoryAction('annotation-data-drag', {
      persistAcrossUnchangedRenders: true,
    });
  }, [beginHistoryAction]);

  useEffect(() => {
    if (!selectedBindingGroupId) return;
    const group = pointBindings.syncGroups.find(
      candidate => candidate.id === selectedBindingGroupId
    );
    if (!group || group.members.length === 0) return;
    const firstMember = group.members[0];
    const annotation = measurements.find(
      measurement => measurement.id === firstMember.annotationId
    );
    const point = annotation?.points[firstMember.pointIndex];
    if (point) setCenterOnPoint({ x: point.x, y: point.y });
  }, [
    measurements,
    pointBindings.syncGroups,
    selectedBindingGroupId,
    setCenterOnPoint,
  ]);

  const clearAllMeasurements = useCallback(() => {
    setMeasurements([]);
    setClickedPoints([]);
    setPointBindings(createEmptyBindings());
    keypointWorkflow.clearKeypointState();
  }, [
    keypointWorkflow,
    setClickedPoints,
    setMeasurements,
    setPointBindings,
  ]);

  const handleClearAllWithHistory = useCallback(() => {
    beginHistoryAction('clear-all', {
      commitImmediately: true,
      snapshot: annotationHistorySnapshot,
    });
    clearAllMeasurements();
  }, [annotationHistorySnapshot, beginHistoryAction, clearAllMeasurements]);

  const handleClearBindings = useCallback(() => {
    clearBindings();
    setSaveMessage('已清除点绑定（再次增减标注时将自动重建）');
    setTimeout(() => setSaveMessage(''), 3000);
  }, [clearBindings, setSaveMessage]);

  const handleToggleImagePanLocked = useCallback(() => {
    setIsImagePanLocked(!isImagePanLocked);
  }, [isImagePanLocked, setIsImagePanLocked]);

  const handleStartManualBinding = useCallback(() => {
    setIsManualBindingMode(true);
    setManualBindingSelectedPoints([]);
  }, [setIsManualBindingMode, setManualBindingSelectedPoints]);

  const handleCanvasClick = useCallback(() => {
    if (!isManualBindingMode) setSelectedBindingGroupId(null);
  }, [isManualBindingMode, setSelectedBindingGroupId]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, setNewTag, setTags, tags]);

  const handleRemoveTag = useCallback(
    (index: number) => {
      setTags(tags.filter((_, tagIndex) => tagIndex !== index));
    },
    [setTags, tags]
  );

  const { handleReportGenerate, handleCopyReport } = useReportActions({
    imageData,
    measurements,
    reportText,
    setReportText,
    setSaveMessage,
  });

  return {
    headerProps: {
      imageData,
      saveMessage,
      measurementsLength:
        measurements.length + keypointWorkflow.keypoints.length,
      isSaving: studyHeaderActions.isSaving,
      canExportJson,
      canUseKeypointTools: canUseKeypoints,
      isAIDetecting: studyHeaderActions.isAIDetecting,
      isAIMeasuring: studyHeaderActions.isAIMeasuring,
      hasVertebraeLayer: keypointWorkflow.activeVertebraeLayer.length > 0,
      showVertebraeLayer: keypointWorkflow.showVertebraeLayer,
      onToggleVertebraeLayer: keypointWorkflow.handleToggleVertebraeLayer,
      onSave: studyHeaderActions.handleSaveMeasurements,
      onExportJson: measurementWorkflow.exportAnnotationsToJSON,
      onImportJson: measurementWorkflow.importAnnotationsFromJSON,
      onAIMeasure: handleAIMeasurementWithHistory,
      onGenerateReport: handleReportGenerate,
    },
    canvasProps: {
      selectedImage: imageData,
      measurements,
      selectedTool,
      setSelectedTool,
      onMeasurementAdd: handleMeasurementAddWithHistory,
      onMeasurementsUpdate: setMeasurements,
      onMeasurementUpdate: handleMeasurementUpdateWithHistory,
      onMeasurementDelete: handleMeasurementDeleteWithHistory,
      onClearAll: handleClearAllWithHistory,
      canUndoAnnotationHistory,
      onUndoAnnotationHistory: undoAnnotationHistory,
      tools,
      clickedPoints,
      setClickedPoints,
      imageId,
      isSettingStandardDistance,
      setIsSettingStandardDistance,
      standardDistancePoints,
      setStandardDistancePoints,
      standardDistance,
      hoveredStandardPointIndex,
      setHoveredStandardPointIndex,
      draggingStandardPointIndex,
      setDraggingStandardPointIndex,
      recalculateAVTandTS: (distance?: number, points?: typeof standardDistancePoints) =>
        recalculateAVTandTS(imageNaturalSize, distance, points),
      onImageSizeChange: setImageNaturalSize,
      onToolChange: handleToolChange,
      isImagePanLocked,
      pointBindings,
      setPointBindings,
      selectedBindingGroupId,
      centerOnPoint,
      onCenterConsumed: () => setCenterOnPoint(null),
      onCanvasClick: handleCanvasClick,
      isManualBindingMode,
      manualBindingSelectedPoints,
      onManualBindingPointToggle: toggleManualBindingPoint,
      vertebraeLayer: keypointWorkflow.activeVertebraeLayer,
      keypoints: isKeypointExam ? keypointWorkflow.keypoints : [],
      cfhAnnotation: keypointWorkflow.cfhAnnotation,
      showVertebraeLayer: keypointWorkflow.showVertebraeLayer,
      onVertebraeUpdate: keypointWorkflow.handleVertebraeUpdate,
      onVertebraePreviewUpdate:
        keypointWorkflow.handleVertebraePreviewUpdate,
      onKeypointAdd: handleKeypointAddWithHistory,
      onKeypointDelete: handleKeypointDeleteWithHistory,
      onMeasurementWriteback: keypointWorkflow.handleMeasurementWriteback,
      onCobbKeypointsSync: keypointWorkflow.handleCobbKeypointsSync,
      onAnnotationDataDragStart: handleAnnotationDataDragStart,
    },
    toolbarProps: {
      examType: imageData.examType,
      tools,
      measurements,
      keypoints: keypointWorkflow.keypoints,
      completeVertebraGroups: keypointWorkflow.completeVertebraGroups,
      canUseKeypointTools: canUseKeypoints,
      selectedTool,
      isSettingStandardDistance,
      standardDistance,
      standardDistancePointsLength: standardDistancePoints.length,
      standardDistanceValue,
      reportText,
      saveMessage,
      pointBindings,
      selectedBindingGroupId,
      isBindingPanelOpen,
      isManualBindingMode,
      manualBindingSelectedPointsCount: manualBindingSelectedPoints.length,
      showTagPanel,
      tags,
      newTag,
      showAdvicePanel,
      treatmentAdvice,
      automaticToolStatus: measurementWorkflow.automaticToolStatus,
      onSelectTool: standardDistanceActions.handleSelectTool,
      onRestoreAutomaticMeasurement:
        measurementWorkflow.handleRestoreAutomaticMeasurement,
      onCreateAvt: keypointWorkflow.handleCreateAvt,
      onCreateVertebraCenter: keypointWorkflow.handleCreateVertebraCenter,
      onCreateCobb: handleCreateCobbWithHistory,
      onRectifyVertebraCornerOrder:
        handleRectifyVertebraCornerOrderWithHistory,
      onActivateHandMode: activateHandMode,
      onToggleImagePanLocked: handleToggleImagePanLocked,
      isImagePanLocked,
      onToggleBindingPanel: () => setIsBindingPanelOpen(open => !open),
      onClearBindings: handleClearBindings,
      onStartManualBinding: handleStartManualBinding,
      onCompleteManualBinding: completeManualBinding,
      onCancelManualBinding: cancelManualBinding,
      onSelectBindingGroup: setSelectedBindingGroupId,
      onRemoveBindingGroup: removeBindingGroup,
      onRemoveBindingMember: removeBindingMember,
      onStartStandardDistance: standardDistanceActions.handleStartStandardDistance,
      onChangeStandardDistanceValue: setStandardDistanceValue,
      onStandardDistanceInputBlur:
        standardDistanceActions.handleStandardDistanceInputBlur,
      onStandardDistanceInputEnter:
        standardDistanceActions.handleStandardDistanceInputEnter,
      onToggleTagPanel: () => setShowTagPanel(!showTagPanel),
      onChangeNewTag: setNewTag,
      onAddTag: handleAddTag,
      onRemoveTag: handleRemoveTag,
      onToggleAdvicePanel: () => setShowAdvicePanel(!showAdvicePanel),
      onChangeTreatmentAdvice: setTreatmentAdvice,
      onCopyReport: handleCopyReport,
    },
    standardDistanceWarningProps: {
      open: showStandardDistanceWarning,
      onClose: () => setShowStandardDistanceWarning(false),
    },
    studyLoading,
    imageList,
  };
}
