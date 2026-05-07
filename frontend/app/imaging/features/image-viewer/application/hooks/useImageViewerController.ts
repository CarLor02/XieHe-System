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
  canUseKeypointTools,
  useImageListFetcher,
  useImageStudy,
  useStudyDataLoader,
  useStudyHeaderActions,
} from '@/app/imaging/features/image-viewer/features/study';
import { useReportActions } from '@/app/imaging/features/image-viewer/features/report';
import {
  isAnteriorExamType,
  isKeypointSupportedExamType,
  isLateralExamType,
  useKeypointMeasurementWorkflow,
} from '@/app/imaging/features/image-viewer/features/keypoints';

interface UseImageViewerControllerOptions {
  imageId: string;
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
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.is_superuser === true || user.is_system_admin === true;
  }, [user]);
  const canUseKeypoints = useMemo(() => canUseKeypointTools(user), [user]);
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

  const measurementWorkflow = useMeasurementWorkflow({
    imageId,
    examType: imageData.examType,
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
    keypoints: keypointWorkflow.keypoints,
    setKeypoints: keypointWorkflow.setKeypoints,
    activeVertebraeLayer: keypointWorkflow.activeVertebraeLayer,
    setVertebraeLayer: keypointWorkflow.setVertebraeLayer,
    cfhAnnotation: keypointWorkflow.cfhAnnotation,
    setCfhAnnotation: keypointWorkflow.setCfhAnnotation,
    rebuildKeypointMeasurements: keypointWorkflow.rebuildKeypointMeasurements,
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
    rebuildKeypointMeasurements: keypointWorkflow.rebuildKeypointMeasurements,
    lateralDetectionResultRef: keypointWorkflow.lateralDetectionResultRef,
    aiMeasurementIdsRef: keypointWorkflow.aiMeasurementIdsRef,
    setSaveMessage,
  });

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
      isAdmin,
      canUseKeypointTools: canUseKeypoints,
      isAIDetecting: studyHeaderActions.isAIDetecting,
      isAIMeasuring: studyHeaderActions.isAIMeasuring,
      hasVertebraeLayer: keypointWorkflow.activeVertebraeLayer.length > 0,
      showVertebraeLayer: keypointWorkflow.showVertebraeLayer,
      onToggleVertebraeLayer: keypointWorkflow.handleToggleVertebraeLayer,
      onSave: studyHeaderActions.handleSaveMeasurements,
      onExportJson: measurementWorkflow.exportAnnotationsToJSON,
      onImportJson: measurementWorkflow.importAnnotationsFromJSON,
      onAIMeasure: studyHeaderActions.handleAIMeasurement,
      onGenerateReport: handleReportGenerate,
    },
    canvasProps: {
      selectedImage: imageData,
      measurements,
      selectedTool,
      setSelectedTool,
      onMeasurementAdd: measurementWorkflow.handleAddMeasurement,
      onMeasurementsUpdate: setMeasurements,
      onMeasurementDelete: measurementWorkflow.handleMeasurementDelete,
      onClearAll: clearAllMeasurements,
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
      onVertebraeUpdate: canUseKeypoints
        ? keypointWorkflow.handleVertebraeUpdate
        : undefined,
      onVertebraePreviewUpdate: canUseKeypoints
        ? keypointWorkflow.handleVertebraePreviewUpdate
        : undefined,
      onKeypointAdd: keypointWorkflow.handleKeypointAdd,
      onKeypointDelete: keypointWorkflow.handleKeypointDelete,
      onMeasurementWriteback: keypointWorkflow.handleMeasurementWriteback,
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
      onCreateTts: keypointWorkflow.handleCreateTts,
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
