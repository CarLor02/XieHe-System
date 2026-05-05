'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/lib/api';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationToolbar from './components/AnnotationToolbar';
import StudyHeader from './components/StudyHeader';
import {
  autoCreatePositionBindings,
  autoCreateS1Bindings,
  cleanupBindings,
  createEmptyBindings,
  mergeBindings,
} from './domain/annotation-binding';
import {
  CalculationContext,
  getAnnotationConfig,
  getAnnotationTypeId,
} from './catalog/shared/annotation-config';
import { calculateMeasurementValue as calcMeasurementValue } from './domain/annotation-calculation';
import { getInheritedPoints } from './domain/annotation-inheritance';
import { filterUniqueAnnotationDuplicates } from './domain/annotation-uniqueness';
import { getDescriptionForType as getDesc } from './domain/annotation-metadata';
import { getToolsForExamType as getTools } from './catalog/exam-tool-catalog';
import { useAnnotationEngine } from './hooks/useAnnotationEngine';
import * as hooks from './hooks/index';
import * as usecases from './usecase/index';
import { getAiMeasurementsResponse } from '@/services/imageServices';
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from './types';
import {
  deriveAllMeasurements,
  DERIVED_ID_PREFIX,
} from './domain/vertebrae-derive';
import {
  deleteKeypoint,
  getCompleteSelectableVertebraGroups,
  hasKeypoint,
  isAnteriorExamType,
  isKeypointSupportedExamType,
  isLateralExamType,
  KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToDerivedLayer,
  keypointsToPersistedLayer,
  upsertKeypoint,
  vertebraeLayerToKeypoints,
} from './domain/keypoint-state';
import { canUseKeypointTools } from './domain/viewer-permissions';
import { AP_AUTOMATIC_MEASUREMENT_TOOL_IDS } from './catalog/ap/measurements';
import { LATERAL_RESTORABLE_MEASUREMENT_TOOL_IDS } from './catalog/lateral/measurements';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

interface ImageViewerProps {
  imageId: string;
}

function areKeypointsEqual(
  left: KeypointAnnotation[],
  right: KeypointAnnotation[]
): boolean {
  if (left.length !== right.length) return false;

  const sortedLeft = [...left].sort((a, b) => a.id.localeCompare(b.id));
  const sortedRight = [...right].sort((a, b) => a.id.localeCompare(b.id));

  return sortedLeft.every((item, index) => {
    const other = sortedRight[index];
    return (
      item.id === other.id &&
      item.source === other.source &&
      item.confidence === other.confidence &&
      item.point.x === other.point.x &&
      item.point.y === other.point.y
    );
  });
}

function isDerivedCobbMeasurement(measurement: MeasurementData): boolean {
  return (
    measurement.id.startsWith(`${DERIVED_ID_PREFIX}cobb-`) &&
    getAnnotationTypeId(measurement.type) === 'cobb' &&
    Boolean(measurement.upperVertebra && measurement.lowerVertebra)
  );
}

export default function ImageViewer({ imageId }: ImageViewerProps) {
  const { user } = useUser(); // 获取当前用户信息
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
  } = hooks.useMeasurements();
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
  } = hooks.useCanvasInteraction();
  const {
    isSaving,
    setIsSaving,
    isMeasurementsLoading,
    setIsMeasurementsLoading,
    saveMessage,
    setSaveMessage,
  } = hooks.useAnnotationPersistence();
  const {
    studyData,
    setStudyData,
    studyLoading,
    setStudyLoading,
    imageList,
    setImageList,
    imageNaturalSize,
    setImageNaturalSize,
  } = hooks.useImageStudy();

  // 清空所有测量数据（包括检测层）
  const clearAllMeasurements = () => {
    setMeasurements([]);
    setClickedPoints([]);
    setPointBindings(createEmptyBindings()); // 同时清除点绑定
    setVertebraeLayer([]);
    setKeypoints([]);
    setCfhAnnotation(null);
    setShowVertebraeLayer(false);
    aiMeasurementIdsRef.current = new Set();
  };
  // 权限检查：判断当前用户是否为管理员
  const isAdmin = useMemo(() => {
    if (!user) return false;
    // 超级管理员或系统管理员都算作admin
    return user.is_superuser === true || user.is_system_admin === true;
  }, [user]);
  const canUseKeypoints = useMemo(() => canUseKeypointTools(user), [user]);

  // AI检测和测量
  const [isAIDetecting, setIsAIDetecting] = useState(false);
  const [isAIMeasuring, setIsAIMeasuring] = useState(false);

  // 椎体标注层（独立于 measurements[]，仅 AI 检测结果写入这里）
  const [vertebraeLayer, setVertebraeLayer] = useState<VertebraAnnotation[]>(
    []
  );
  const [keypoints, setKeypoints] = useState<KeypointAnnotation[]>([]);
  const [cfhAnnotation, setCfhAnnotation] = useState<CfhAnnotation | null>(
    null
  );
  const [showVertebraeLayer, setShowVertebraeLayer] = useState(false);
  /**
   * 记录 AI 测量接口返回的测量 ID。
   * 用于在用户拖拽角点重推导时，把这批 AI 测量一起替换掉，避免与推导测量重复。
   */
  const aiMeasurementIdsRef = useRef<Set<string>>(new Set());
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
  /** DB annotation 已成功加载时置 true，防止 localStorage 后续覆盖 */
  const dbAnnotationLoadedRef = useRef(false);

  useEffect(() => {
    if (!selectedBindingGroupId) return;
    const group = pointBindings.syncGroups.find(
      g => g.id === selectedBindingGroupId
    );
    if (!group || group.members.length === 0) return;
    const firstMember = group.members[0];
    const annotation = measurements.find(
      m => m.id === firstMember.annotationId
    );
    const pt = annotation?.points[firstMember.pointIndex];
    if (pt) setCenterOnPoint({ x: pt.x, y: pt.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBindingGroupId]);

  /** 手动解除绑定（临时清空，下次添加/删除标注时将自动恢复） */
  const handleClearBindings = () => {
    clearBindings();
    setSaveMessage('已清除点绑定（再次增减标注时将自动重建）');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // 从API获取真实的影像数据
  hooks.useStudyDataLoader(
    imageId,
    setStudyData,
    setStudyLoading,
    setMeasurements,
    setStandardDistance,
    setStandardDistancePoints,
    setPointBindings,
    dbAnnotationLoadedRef,
    layer => {
      setVertebraeLayer(layer);
    },
    setCfhAnnotation
  );

  // 当图像尺寸确定后，自动加载标注数据
  hooks.useLocalAnnotationsDataLoader(
    imageId,
    imageNaturalSize,
    setMeasurements,
    standardDistance,
    setStandardDistance,
    standardDistancePoints,
    setStandardDistancePoints,
    setPointBindings,
    dbAnnotationLoadedRef,
    calcMeasurementValue,
    getDesc,
    layer => {
      setVertebraeLayer(layer);
    },
    setCfhAnnotation
  );

  // 构建兼容的imageData对象
  const imageData = studyData
    ? {
        id: imageId,
        patientName: studyData.patient_name,
        patientId: studyData.patient_id ? studyData.patient_id.toString() : '0',
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
      };

  // 使用配置文件获取工具列表
  const tools = getTools(imageData.examType);
  const isAnteriorView = isAnteriorExamType(imageData.examType);
  const isLateralView = isLateralExamType(imageData.examType);
  const isKeypointExam = isKeypointSupportedExamType(imageData.examType);
  const completeVertebraGroups = useMemo(
    () => getCompleteSelectableVertebraGroups(keypoints, imageData.examType),
    [imageData.examType, keypoints]
  );
  const activeVertebraeLayer = useMemo(
    () =>
      isKeypointExam && keypoints.length > 0
        ? keypointsToPersistedLayer(keypoints)
        : vertebraeLayer,
    [isKeypointExam, keypoints, vertebraeLayer]
  );

  useEffect(() => {
    if (!isKeypointExam) return;
    if (vertebraeLayer.length === 0 && !cfhAnnotation) return;

    const restoredKeypoints = vertebraeLayerToKeypoints(
      vertebraeLayer,
      imageData.examType,
      cfhAnnotation
    );
    if (restoredKeypoints.length === 0) return;

    setKeypoints(previous =>
      areKeypointsEqual(previous, restoredKeypoints)
        ? previous
        : restoredKeypoints
    );
  }, [cfhAnnotation, imageData.examType, isKeypointExam, vertebraeLayer]);

  /** 当选择新工具时，如果有继承的点且用户未开始标注，则自动加载继承点 */
  useEffect(() => {
    if (!selectedTool || selectedTool === 'hand' || clickedPoints.length > 0)
      return;

    const currentTool = tools.find(t => t.id === selectedTool);
    if (
      !currentTool ||
      !currentTool.pointsNeeded ||
      currentTool.pointsNeeded <= 0
    )
      return;

    // 这些工具存在非连续继承索引，或需要将手动点与继承点分开处理，避免点序混排导致完成判定错误
    if (
      currentTool.id === 'sva' ||
      currentTool.id === 'ss' ||
      currentTool.id === 'cl' ||
      currentTool.id === 'll-l1-s1' ||
      currentTool.id === 'll-l1-l4' || // LL L1-L4: 继承点在索引0-1，手动点在2-3
      currentTool.id === 'll-l4-s1' ||
      currentTool.id === 'pi' ||
      currentTool.id === 'pt' ||
      currentTool.id === 'tpa' ||
      currentTool.id === 'ts' || // TS: 继承点在索引4-5，手动点在0-3
      currentTool.id === 'tts' // TTS: 继承点在索引2-3，手动点在0-1
    ) {
      return;
    }

    const { points: inheritedPts } = getInheritedPoints(
      currentTool.id,
      measurements
    );
    if (inheritedPts.length > 0) {
      setClickedPoints(inheritedPts);
    }
  }, [selectedTool, measurements, clickedPoints.length, tools]);

  // 获取计算上下文（用于标注计算）
  const getCalculationContext = (): CalculationContext => ({
    standardDistance,
    standardDistancePoints,
    imageNaturalSize,
  });

  // 根据测量类型和点位计算测量值
  const calculateMeasurementValue = (type: string, points: Point[]): string => {
    return calcMeasurementValue(type, points, getCalculationContext());
  };

  // 根据测量类型获取描述
  const getDescriptionForType = (type: string): string => {
    return getDesc(type);
  };

  const findDerivedVertebra = (
    layer: VertebraAnnotation[],
    label: string
  ): VertebraAnnotation | undefined =>
    layer.find(annotation => annotation.label === label);

  const createVertebraCenterMeasurement = (
    vertebra: string,
    nextKeypoints: KeypointAnnotation[]
  ): MeasurementData | null => {
    const layer = keypointsToDerivedLayer(nextKeypoints, imageData.examType);
    const annotation = findDerivedVertebra(layer, vertebra);
    if (!annotation) return null;
    const prefix = isLateralView ? 'lateral' : 'ap';

    return {
      id: `${prefix}-keypoint-vertebra-center-${vertebra.toLowerCase()}`,
      type: 'vertebra-center',
      value: calculateMeasurementValue('vertebra-center', annotation.corners),
      points: annotation.corners,
      description: `椎体中心 ${vertebra}`,
      upperVertebra: vertebra,
      lowerVertebra: null,
      apexVertebra: null,
    };
  };

  const createTtsMeasurement = (
    upperVertebra: string,
    lowerVertebra: string,
    nextKeypoints: KeypointAnnotation[]
  ): MeasurementData | null => {
    const byId = new Map(
      nextKeypoints.map(keypoint => [keypoint.id, keypoint])
    );
    const sl = byId.get('SL');
    const sr = byId.get('SR');
    if (!sl || !sr) return null;

    const layer = keypointsToDerivedLayer(nextKeypoints, '正位X光片');
    const upper = findDerivedVertebra(layer, upperVertebra);
    const lower = findDerivedVertebra(layer, lowerVertebra);
    if (!upper || !lower) return null;

    const upperCenter = {
      x: upper.corners.reduce((sum, point) => sum + point.x, 0) / 4,
      y: upper.corners.reduce((sum, point) => sum + point.y, 0) / 4,
    };
    const lowerCenter = {
      x: lower.corners.reduce((sum, point) => sum + point.x, 0) / 4,
      y: lower.corners.reduce((sum, point) => sum + point.y, 0) / 4,
    };
    const points = [upperCenter, lowerCenter, sl.point, sr.point];

    return {
      id: 'ap-keypoint-tts',
      type: 'tts',
      value: calculateMeasurementValue('tts', points),
      points,
      description: `TTS ${upperVertebra}-${lowerVertebra}`,
      upperVertebra,
      lowerVertebra,
      apexVertebra: null,
    };
  };

  const createAvtMeasurement = (
    apexVertebra: string,
    nextKeypoints: KeypointAnnotation[]
  ): MeasurementData | null => {
    const byId = new Map(
      nextKeypoints.map(keypoint => [keypoint.id, keypoint])
    );
    const sl = byId.get('SL');
    const sr = byId.get('SR');
    if (!sl || !sr) return null;

    const layer = keypointsToDerivedLayer(nextKeypoints, '正位X光片');
    const apex = findDerivedVertebra(layer, apexVertebra);
    if (!apex) return null;

    const apexCenter = {
      x: apex.corners.reduce((sum, point) => sum + point.x, 0) / 4,
      y: apex.corners.reduce((sum, point) => sum + point.y, 0) / 4,
    };
    const midlineX = (sl.point.x + sr.point.x) / 2;
    const points = [apexCenter, { x: midlineX, y: apexCenter.y }];

    return {
      id: 'ap-keypoint-avt',
      type: 'avt',
      value: calculateMeasurementValue('avt', points),
      points,
      description: `AVT ${apexVertebra}`,
      upperVertebra: null,
      lowerVertebra: null,
      apexVertebra,
    };
  };

  const createCobbMeasurement = (
    upperVertebra: string,
    lowerVertebra: string,
    nextKeypoints: KeypointAnnotation[],
    existingMeasurement?: MeasurementData
  ): MeasurementData | null => {
    if (upperVertebra === lowerVertebra) return null;

    const layer = keypointsToDerivedLayer(nextKeypoints, imageData.examType);
    const upper = findDerivedVertebra(layer, upperVertebra);
    const lower = findDerivedVertebra(layer, lowerVertebra);
    if (!upper || !lower) return null;

    const points = [
      upper.corners[0],
      upper.corners[1],
      lower.corners[2],
      lower.corners[3],
    ];
    const idSuffix = `${upperVertebra}-${lowerVertebra}`.toLowerCase();
    const type = existingMeasurement?.type ?? 'Cobb';

    return {
      id:
        existingMeasurement?.id ?? `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`,
      type,
      value: calculateMeasurementValue(type, points),
      points,
      description: `[推导] Cobb（上=${upperVertebra}, 下=${lowerVertebra}）`,
      upperVertebra,
      lowerVertebra,
      apexVertebra: existingMeasurement?.apexVertebra ?? null,
    };
  };

  const createBoundCobbMeasurement = (
    measurement: MeasurementData,
    nextKeypoints: KeypointAnnotation[]
  ): MeasurementData | null => {
    if (!measurement.upperVertebra || !measurement.lowerVertebra) return null;
    return createCobbMeasurement(
      measurement.upperVertebra,
      measurement.lowerVertebra,
      nextKeypoints,
      measurement
    );
  };

  const deriveKeypointMeasurements = useCallback(
    (nextKeypoints: KeypointAnnotation[]): MeasurementData[] => {
      const derivedLayer = keypointsToDerivedLayer(
        nextKeypoints,
        imageData.examType
      );
      return deriveAllMeasurements(
        derivedLayer,
        isLateralView ? null : cfhAnnotation,
        imageData.examType
      ).map(m => ({
        ...m,
        value: calcMeasurementValue(m.type, m.points, getCalculationContext()),
      }));
    },
    [
      cfhAnnotation,
      imageData.examType,
      imageNaturalSize,
      isLateralView,
      standardDistance,
      standardDistancePoints,
    ]
  );

  const rebuildKeypointMeasurements = useCallback(
    (
      previousMeasurements: MeasurementData[],
      nextKeypoints: KeypointAnnotation[]
    ): MeasurementData[] => {
      const boundCobbIds = new Set(
        previousMeasurements
          .filter(isDerivedCobbMeasurement)
          .map(measurement => measurement.id)
      );
      const hasExistingDerivedCobb = boundCobbIds.size > 0;
      const derivedWithValues = deriveKeypointMeasurements(
        nextKeypoints
      ).filter(
        measurement =>
          !isDerivedCobbMeasurement(measurement) ||
          (!hasExistingDerivedCobb && !boundCobbIds.has(measurement.id))
      );

      const boundCobbMeasurements = previousMeasurements
        .filter(isDerivedCobbMeasurement)
        .map(measurement =>
          createBoundCobbMeasurement(measurement, nextKeypoints)
        )
        .filter(
          (measurement): measurement is MeasurementData => measurement !== null
        );

      const centerMeasurements = previousMeasurements
        .filter(
          measurement =>
            measurement.type === 'vertebra-center' && measurement.upperVertebra
        )
        .map(measurement =>
          createVertebraCenterMeasurement(
            measurement.upperVertebra!,
            nextKeypoints
          )
        )
        .filter(
          (measurement): measurement is MeasurementData => measurement !== null
        );

      const existingTts = previousMeasurements.find(
        measurement => measurement.id === 'ap-keypoint-tts'
      );
      const ttsMeasurement =
        existingTts?.upperVertebra && existingTts.lowerVertebra
          ? createTtsMeasurement(
              existingTts.upperVertebra,
              existingTts.lowerVertebra,
              nextKeypoints
            )
          : null;
      const existingAvt = previousMeasurements.find(
        measurement => measurement.id === 'ap-keypoint-avt'
      );
      const avtMeasurement = existingAvt?.apexVertebra
        ? createAvtMeasurement(existingAvt.apexVertebra, nextKeypoints)
        : null;

      return [
        ...previousMeasurements.filter(
          measurement =>
            !measurement.id.startsWith(DERIVED_ID_PREFIX) &&
            !aiMeasurementIdsRef.current.has(measurement.id) &&
            !(
              measurement.type === 'vertebra-center' &&
              measurement.upperVertebra
            ) &&
            measurement.id !== 'ap-keypoint-avt' &&
            measurement.id !== 'ap-keypoint-tts'
        ),
        ...derivedWithValues,
        ...boundCobbMeasurements,
        ...centerMeasurements,
        ...(avtMeasurement ? [avtMeasurement] : []),
        ...(ttsMeasurement ? [ttsMeasurement] : []),
      ];
    },
    [deriveKeypointMeasurements]
  );

  useEffect(() => {
    if (!isKeypointExam || keypoints.length === 0) return;
    setMeasurements(previous =>
      rebuildKeypointMeasurements(previous, keypoints)
    );
  }, [isKeypointExam, keypoints, rebuildKeypointMeasurements, setMeasurements]);

  const handleAddMeasurement = useCallback(
    (toolType: string, points: Point[]) => {
      usecases.addMeasurement(
        toolType,
        points,
        measurements,
        setMeasurements,
        tools,
        standardDistance,
        standardDistancePoints,
        imageNaturalSize
      );
    },
    [
      imageNaturalSize,
      measurements,
      standardDistance,
      standardDistancePoints,
      tools,
    ]
  );

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
    [isLateralView, rebuildKeypointMeasurements]
  );

  const handleKeypointAdd = useCallback(
    (keypointId: string, point: Point) => {
      if (!canUseKeypoints) {
        setSaveMessage('无权限：仅主任医师及以上可添加关键点');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      if (!isKeypointExam) return;
      if (hasKeypoint(keypoints, keypointId)) {
        setSaveMessage(`${keypointId} 已存在，不能重复添加`);
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      const nextKeypoints = upsertKeypoint(keypoints, {
        id: keypointId,
        point,
        source: 'manual',
        confidence: 1,
      });
      applyKeypoints(nextKeypoints);
      setShowVertebraeLayer(true);
    },
    [applyKeypoints, canUseKeypoints, isKeypointExam, keypoints, setSaveMessage]
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

      if (removedMeasurements.length > 0) {
        setSaveMessage(
          `已删除 ${keypointId}，并移除 ${removedMeasurements.length} 个关联测量项`
        );
      } else {
        setSaveMessage(`已删除 ${keypointId}`);
      }
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [
      isKeypointExam,
      isLateralView,
      keypoints,
      measurements,
      rebuildKeypointMeasurements,
      setSaveMessage,
    ]
  );

  const handleCreateVertebraCenter = useCallback(
    (vertebra: string) => {
      const measurement = createVertebraCenterMeasurement(vertebra, keypoints);
      if (!measurement) {
        setSaveMessage(`缺少 ${vertebra} 的完整关键点，无法创建椎体中心`);
        setTimeout(() => setSaveMessage(''), 3000);
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
    [keypoints, setSaveMessage]
  );

  const handleCreateTts = useCallback(
    (upperVertebra: string, lowerVertebra: string) => {
      if (!standardDistance) {
        setShowStandardDistanceWarning(true);
        return;
      }
      const measurement = createTtsMeasurement(
        upperVertebra,
        lowerVertebra,
        keypoints
      );
      if (!measurement) {
        setSaveMessage('缺少 TTS 所需关键点，无法创建');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      setMeasurements(previous => [
        ...previous.filter(item => item.type.toLowerCase() !== 'tts'),
        measurement,
      ]);
    },
    [
      keypoints,
      setSaveMessage,
      setShowStandardDistanceWarning,
      standardDistance,
    ]
  );

  const handleCreateCobb = useCallback(
    (upperVertebra: string, lowerVertebra: string) => {
      const existing = measurements.find(
        measurement =>
          isDerivedCobbMeasurement(measurement) &&
          measurement.upperVertebra === upperVertebra &&
          measurement.lowerVertebra === lowerVertebra
      );
      const measurement = createCobbMeasurement(
        upperVertebra,
        lowerVertebra,
        keypoints,
        existing
      );
      if (!measurement) {
        setSaveMessage('缺少 Cobb 所需端椎关键点，无法创建');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      setMeasurements(previous => [
        ...previous.filter(item => item.id !== measurement.id),
        measurement,
      ]);
      setSaveMessage(`已创建 Cobb(${upperVertebra}-${lowerVertebra})`);
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [keypoints, measurements, setSaveMessage]
  );

  const handleCreateAvt = useCallback(
    (apexVertebra: string) => {
      if (!standardDistance) {
        setShowStandardDistanceWarning(true);
        return;
      }
      const measurement = createAvtMeasurement(apexVertebra, keypoints);
      if (!measurement) {
        setSaveMessage('缺少 AVT 所需关键点，无法创建');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      setMeasurements(previous => [
        ...previous.filter(item => getAnnotationTypeId(item.type) !== 'avt'),
        measurement,
      ]);
    },
    [
      keypoints,
      setMeasurements,
      setSaveMessage,
      setShowStandardDistanceWarning,
      standardDistance,
    ]
  );

  // 获取影像列表
  hooks.useImageListFetcher(setImageList);

  const currentIndex = imageList.indexOf(imageId);

  // 报告生成回调
  const handleReportGenerate = useCallback(() => {
    void usecases.generateReport(
      imageData,
      measurements,
      setReportText,
      setSaveMessage
    );
  }, [imageData, measurements]);

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
    const status: Record<string, 'available' | 'exists' | 'missing-keypoints'> =
      {};
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
        setSaveMessage(`${toolName} 当前不可恢复`);
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      setMeasurements(previous => {
        const additions = missing.filter(
          candidate => !derivedMeasurementExists(previous, candidate, toolId)
        );
        return filterUniqueAnnotationDuplicates([...previous, ...additions]);
      });

      const toolName = getAnnotationConfig(toolId)?.name ?? toolId;
      setSaveMessage(`已恢复 ${toolName}`);
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [
      derivedMeasurementExists,
      getDerivedMeasurementsForTool,
      measurements,
      setMeasurements,
      setSaveMessage,
    ]
  );

  // 获取当前工具
  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

  // 这段目前不需要，useStudyDataLoader 里面就加载了测量和标准数据
  // // 加载测量数据 - 异步加载，不阻止图像显示
  // useEffect(() => {
  //   loadMeasurements();
  //   // loadAnnotationsFromLocalStorage 由 imageNaturalSize useEffect 统一调用，此处不重复
  // }, [imageId]);
  //
  // const loadMeasurements = async () => {
  //   setIsMeasurementsLoading(true);
  //   try {
  //     // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零），与保存时保持一致
  //     const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
  //     const response = await apiClient.get(`/api/v1/measurements/${numericId}`);
  //     if (response.status === 200) {
  //       // 使用 extractData 提取测量数据
  //       const data = extractData<any>(response);
  //       // DB annotation 已加载时跳过，避免覆盖正确的 measurements+bindings
  //       if (
  //         !dbAnnotationLoadedRef.current &&
  //         data.measurements &&
  //         data.measurements.length > 0
  //       ) {
  //         setMeasurements(data.measurements);
  //         if (data.reportText) {
  //           setReportText(data.reportText);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.log('加载测量数据失败:', error);
  //     // 如果加载失败，使用默认空数据
  //   } finally {
  //     setIsMeasurementsLoading(false);
  //   }
  // };

  // // 保存标注数据到localStorage和服务器
  // const saveAnnotationsToLocalStorage = async () => {
  //   if (measurements.length === 0) {
  //     setSaveMessage('暂无测量数据需要保存');
  //     setTimeout(() => setSaveMessage(''), 3000);
  //     return;
  //   }
  //
  //   setIsSaving(true);
  //   setSaveMessage('');
  //
  //   try {
  //     // 1. 保存到本地存储
  //     const key = `annotations_${imageId}`;
  //     // 保存id、type和points（id用于绑定引用，value和description可重新计算）
  //     const simplifiedMeasurements = measurements.map(m => ({
  //       id: m.id,
  //       type: m.type,
  //       points: m.points,
  //     }));
  //     const localData = {
  //       imageId: imageId,
  //       imageWidth: imageNaturalSize?.width,
  //       imageHeight: imageNaturalSize?.height,
  //       measurements: simplifiedMeasurements,
  //       standardDistance: standardDistance,
  //       standardDistancePoints: standardDistancePoints,
  //       pointBindings: pointBindings,
  //     };
  //     localStorage.setItem(key, JSON.stringify(localData, null, 2));
  //     console.log(
  //       `已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`
  //     );
  //
  //     // 2. 保存到服务器
  //     // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零）
  //     const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
  //     const measurementData = {
  //       imageId: numericId,
  //       patientId: imageData.patientId,
  //       examType: imageData.examType,
  //       measurements: measurements,
  //       reportText: reportText,
  //       savedAt: new Date().toISOString(),
  //     };
  //
  //     const response = await apiClient.post(
  //       `/api/v1/measurements/${numericId}`,
  //       measurementData
  //     );
  //
  //     console.log('保存响应:', response.status);
  //
  //     if (response.status === 200) {
  //       setSaveMessage('标注已保存到本地和服务器');
  //       setTimeout(() => setSaveMessage(''), 3000);
  //     } else {
  //       const errorMsg =
  //         response.data?.message || response.data?.detail || '保存到服务器失败';
  //       console.error('保存失败:', response.status, errorMsg);
  //       throw new Error(errorMsg);
  //     }
  //   } catch (error: any) {
  //     console.error('保存标注数据失败:', error);
  //     const errorMessage =
  //       error.response?.data?.message ||
  //       error.response?.data?.detail ||
  //       error.message ||
  //       '保存失败，请重试';
  //     setSaveMessage(`保存失败: ${errorMessage}`);
  //     setTimeout(() => setSaveMessage(''), 5000);
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // 导出标注数据为JSON文件（仅管理员）
  const exportAnnotationsToJSON = () => {
    // 权限检查
    if (!isAdmin) {
      setSaveMessage('无权限：仅管理员可以导出JSON文件');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    try {
      // 只保存type和points，移除id、value和description
      const simplifiedMeasurements = measurements.map(m => ({
        type: m.type,
        points: m.points,
      }));

      // 添加图像尺寸信息、标准距离和标准距离标注点，确保坐标系一致性
      const data = {
        imageId: imageId,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        measurements: simplifiedMeasurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints,
      };
      console.log('导出标注数据，图像尺寸:', {
        width: imageNaturalSize?.width,
        height: imageNaturalSize?.height,
        standardDistance: standardDistance,
      });
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations_${imageId}_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaveMessage('标注文件已下载');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('导出标注文件失败:', error);
      setSaveMessage('导出失败，请重试');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // 从JSON文件导入标注数据
  const importAnnotationsFromJSON = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const jsonStr = e.target?.result as string;
        const data = JSON.parse(jsonStr);

        // 验证数据格式
        if (!data.measurements || !Array.isArray(data.measurements)) {
          throw new Error('无效的标注文件格式');
        }

        // 检查是否需要坐标转换（如果导入的文件包含图像尺寸信息）
        const importedImageWidth = data.imageWidth;
        const importedImageHeight = data.imageHeight;
        let scaleX = 1;
        let scaleY = 1;

        if (importedImageWidth && importedImageHeight && imageNaturalSize) {
          // 如果导入文件的图像尺寸与当前图像尺寸不同，需要缩放坐标
          scaleX = imageNaturalSize.width / importedImageWidth;
          scaleY = imageNaturalSize.height / importedImageHeight;
          console.log('导入标注，坐标缩放比例:', {
            importedSize: {
              width: importedImageWidth,
              height: importedImageHeight,
            },
            currentSize: imageNaturalSize,
            scale: { scaleX, scaleY },
          });
        }

        // 导入标注数据，重新生成id、value和description
        const restoredMeasurements = data.measurements.map((m: any) => {
          // 转换坐标（如果需要）
          const scaledPoints = m.points.map((p: any) => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
          }));

          // 对于AI检测的标注，保留原来的value和description
          const isAIDetection = m.type.startsWith('AI检测-');
          const typeId = isAIDetection ? m.type : getAnnotationTypeId(m.type);

          return {
            id:
              Date.now().toString() +
              Math.random().toString(36).substring(2, 11),
            type: typeId,
            value: isAIDetection
              ? m.value || ''
              : calculateMeasurementValue(typeId, scaledPoints),
            points: scaledPoints,
            description: isAIDetection
              ? m.description || m.type
              : getDescriptionForType(typeId),
          };
        });

        setMeasurements(restoredMeasurements);

        // 导入或设置默认标准距离
        if (
          data.standardDistance &&
          data.standardDistancePoints &&
          data.standardDistancePoints.length === 2
        ) {
          // 如果有导入的标准距离，使用它
          const scaledStandardPoints = data.standardDistancePoints.map(
            (p: any) => ({
              x: p.x * scaleX,
              y: p.y * scaleY,
            })
          );
          setStandardDistance(data.standardDistance);
          setStandardDistancePoints(scaledStandardPoints);
          setSaveMessage(
            `已导入 ${restoredMeasurements.length} 个标注和标准距离 ${data.standardDistance}mm`
          );
          console.log(`已导入标准距离: ${data.standardDistance}mm`);
        } else if (imageNaturalSize) {
          // 如果没有导入的标准距离，设置默认值
          const defaultPoints = [
            { x: 0, y: 0 },
            { x: 200, y: 0 },
          ];
          setStandardDistance(100);
          setStandardDistancePoints(defaultPoints);
          setSaveMessage(
            `已导入 ${restoredMeasurements.length} 个标注，未找到标准距离，已设置默认值100mm`
          );
          console.log('导入文件中未找到标准距离，已设置默认值: 100mm');
        } else {
          setSaveMessage(`已导入 ${restoredMeasurements.length} 个标注`);
        }
        setTimeout(() => setSaveMessage(''), 2000);
      } catch (error) {
        console.error('导入标注文件失败:', error);
        setSaveMessage('导入失败，文件格式错误');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    };
    reader.readAsText(file);

    // 重置input，允许导入同一文件
    event.target.value = '';
  };

  // AI测量函数（原AI检测函数）
  const handleAIMeasurement = async () => {
    setIsAIMeasuring(true);
    setSaveMessage('');

    try {
      const aiData = await getAiMeasurementsResponse(
        imageId,
        imageData.examType
      );

      // 解析AI返回的JSON数据并加载到标注界面
      if (aiData.measurements && Array.isArray(aiData.measurements)) {
        const aiImageWidth = aiData.imageWidth || aiData.image_width;
        const aiImageHeight = aiData.imageHeight || aiData.image_height;

        // 尝试从DOM获取实际图像尺寸
        let actualImageSize = imageNaturalSize;
        if (!actualImageSize) {
          // 如果state中没有，尝试直接从DOM获取
          const imgElement = document.querySelector(
            '[data-image-canvas] img'
          ) as HTMLImageElement;
          if (imgElement && imgElement.naturalWidth > 0) {
            actualImageSize = {
              width: imgElement.naturalWidth,
              height: imgElement.naturalHeight,
            };
            // 同时更新state
            setImageNaturalSize(actualImageSize);
          }
        }

        // 坐标转换：AI返回的是基于原始图像尺寸的坐标
        // 我们需要检查是否需要缩放
        let scaleX = 1;
        let scaleY = 1;

        if (actualImageSize && aiImageWidth && aiImageHeight) {
          // 如果AI处理的图像尺寸与实际图像尺寸不同，需要缩放坐标
          scaleX = actualImageSize.width / aiImageWidth;
          scaleY = actualImageSize.height / aiImageHeight;
        }

        // 统计已有的Cobb角数量（用于自动编号）
        let cobbCount = measurements.filter(m =>
          /^cobb\d+$/i.test(m.type)
        ).length;

        const S1_RELATED_TYPES = new Set([
          'ss',
          'll-l1-s1',
          'll-l4-s1',
          'pi',
          'pt',
          'tpa',
          'sva',
        ]);

        const aiMeasurements = filterUniqueAnnotationDuplicates(
          aiData.measurements
            .filter((m: any) => {
              const incomingTypeId = getAnnotationTypeId(m.type);
              // 检查标注类型是否存在于配置中
              // 优先匹配 name（精确匹配），然后匹配 id（小写匹配），最后匹配 name（不区分大小写）
              const tool =
                getAnnotationConfig(m.type) ??
                getAnnotationConfig(incomingTypeId);

              if (!tool || tool.category !== 'measurement') return false;
              if (isLateralView && S1_RELATED_TYPES.has(tool.id)) return false;

              // SVA 改为 5 点法：AI 返回的 SVA 非 5 点时直接过滤，不显示
              if (tool.id === 'sva') {
                return Array.isArray(m.points) && m.points.length === 5;
              }

              return true;
            })
            .map((m: any) => {
              const incomingTypeId = getAnnotationTypeId(m.type);
              const tool =
                getAnnotationConfig(m.type) ??
                getAnnotationConfig(incomingTypeId);
              const requiredPoints = tool?.pointsNeeded || m.points.length;

              // 如果返回的点数超过所需点数，只保留所需数量的点
              let processedPoints = m.points;
              if (requiredPoints > 0 && m.points.length > requiredPoints) {
                processedPoints = m.points.slice(0, requiredPoints);
              }

              // 转换坐标
              const scaledPoints = processedPoints.map((p: any) => ({
                x: p.x * scaleX,
                y: p.y * scaleY,
              }));

              // 将所有Cobb-*类型统一映射为Cobb1, Cobb2, Cobb3
              let finalType = tool?.id || incomingTypeId;
              let isCobb = false;
              if (m.type.startsWith('Cobb-')) {
                cobbCount++;
                finalType = `cobb${cobbCount}`;
                isCobb = true;
              }

              // 根据type和points重新计算value
              // 对于Cobb类型，使用'cobb'配置；其他类型使用原始类型
              const typeForCalculation = isCobb ? 'cobb' : finalType;
              const value = calculateMeasurementValue(
                typeForCalculation,
                scaledPoints
              );

              // 调试：打印椎体信息
              if (isCobb) {
                console.log(`[DEBUG] ${finalType} 椎体信息:`, {
                  upper_vertebra: m.upper_vertebra,
                  lower_vertebra: m.lower_vertebra,
                  apex_vertebra: m.apex_vertebra,
                  原始数据: m,
                });
              }

              return {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substring(2, 11),
                type: finalType, // 使用映射后的类型（Cobb1, Cobb2, Cobb3）
                value: value,
                points: scaledPoints,
                description: isCobb
                  ? 'Cobb角测量'
                  : getDescriptionForType(finalType),
                originalType: m.type, // 保留原始类型用于调试
                // 保存椎体信息（仅Cobb角有）
                upperVertebra: m.upper_vertebra,
                lowerVertebra: m.lower_vertebra,
                apexVertebra: m.apex_vertebra,
              };
            })
        );

        setMeasurements(aiMeasurements);
        // 记录 AI 测量 ID，供 handleVertebraeUpdate 过滤使用
        aiMeasurementIdsRef.current = new Set(
          aiMeasurements.map((m: MeasurementData) => m.id)
        );
        // AI 返回后执行一次基于坐标重合的自动绑定
        const s1Count = aiMeasurements.filter((m: any) =>
          S1_RELATED_TYPES.has(getAnnotationTypeId(m.type))
        ).length;
        const s1Bindings =
          s1Count >= 2
            ? autoCreateS1Bindings(aiMeasurements)
            : createEmptyBindings();
        const posBindings = autoCreatePositionBindings(aiMeasurements);
        setPointBindings(mergeBindings(s1Bindings, posBindings));
        setSaveMessage(`AI测量完成，已加载 ${aiMeasurements.length} 个标注`);
        setTimeout(() => setSaveMessage(''), 3000);

        // 具备关键点权限时顺带运行 AI 检测，填充关键点状态机。
        if (canUseKeypoints) {
          setSaveMessage('AI检测中...');
          void usecases.aiDetect(
            canUseKeypoints,
            imageData,
            layerOrUpdater => {
              setVertebraeLayer(previous => {
                const nextLayer =
                  typeof layerOrUpdater === 'function'
                    ? layerOrUpdater(previous)
                    : layerOrUpdater;
                const nextKeypoints = vertebraeLayerToKeypoints(
                  nextLayer,
                  imageData.examType
                );
                setKeypoints(nextKeypoints);
                setShowVertebraeLayer(true);
                setMeasurements(prev =>
                  rebuildKeypointMeasurements(prev, nextKeypoints)
                );
                return nextLayer;
              });
            },
            setCfhAnnotation,
            setSaveMessage,
            setIsAIDetecting
          );
        }
      } else {
        setSaveMessage('AI测量完成，但未返回有效数据');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('AI测量失败:', error);
      setSaveMessage('AI测量失败，请检查服务是否正常运行');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsAIMeasuring(false);
    }
  };

  // handleAIDetection 已并入 handleAIMeasurement（admin 分支），此处不再需要独立函数

  /**
   * 椎体角点拖拽结束时的回调（由 AnnotationCanvas → VertebraeLayer 触发）。
   * 推导仅在用户主动拖拽后触发，AI检测填充 vertebraeLayer 时不触发，避免重复测量。
   */
  const handleVertebraeUpdate = useCallback(
    (updated: VertebraAnnotation[]) => {
      if (isKeypointExam) {
        const nextKeypoints = vertebraeLayerToKeypoints(
          updated,
          imageData.examType
        );
        applyKeypoints(nextKeypoints);
        return;
      }
      setVertebraeLayer(updated);
      // 推导替换旧的 derived 条目 + AI 测量条目
      const derived = deriveAllMeasurements(
        updated,
        cfhAnnotation,
        imageData.examType
      );
      const derivedWithValues = derived.map(m => ({
        ...m,
        value: calculateMeasurementValue(m.type, m.points),
      }));
      setMeasurements(prev => [
        ...prev.filter(
          m =>
            !m.id.startsWith(DERIVED_ID_PREFIX) &&
            !aiMeasurementIdsRef.current.has(m.id)
        ),
        ...derivedWithValues,
      ]);
    },
    [applyKeypoints, cfhAnnotation, imageData.examType, isKeypointExam]
  );

  const handleVertebraePreviewUpdate = useCallback(
    (updated: VertebraAnnotation[]) => {
      if (!isKeypointExam) return;
      const nextKeypoints = vertebraeLayerToKeypoints(
        updated,
        imageData.examType
      );
      setMeasurements(previous =>
        rebuildKeypointMeasurements(previous, nextKeypoints)
      );
    },
    [imageData.examType, isKeypointExam, rebuildKeypointMeasurements]
  );

  const handleSaveMeasurements = useCallback(() => {
    void usecases.saveMeasurements(
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
    imageId,
    studyData,
    imageNaturalSize,
    standardDistance,
    standardDistancePoints,
    pointBindings,
    measurements,
    reportText,
    activeVertebraeLayer,
    cfhAnnotation,
  ]);

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
        <StudyHeader
          imageData={imageData}
          saveMessage={saveMessage}
          measurementsLength={measurements.length + keypoints.length}
          isSaving={isSaving}
          isAdmin={isAdmin}
          canUseKeypointTools={canUseKeypoints}
          isAIDetecting={isAIDetecting}
          isAIMeasuring={isAIMeasuring}
          hasVertebraeLayer={activeVertebraeLayer.length > 0}
          showVertebraeLayer={showVertebraeLayer}
          onToggleVertebraeLayer={() => {
            setShowVertebraeLayer(v => {
              const next = !v;
              // 从检测模式切回测量模式时，用当前角点重新推导一次，确保测量层是最新的
              if (!next && activeVertebraeLayer.length > 0) {
                if (isKeypointExam) {
                  setMeasurements(prev =>
                    rebuildKeypointMeasurements(prev, keypoints)
                  );
                } else {
                  const derived = deriveAllMeasurements(
                    activeVertebraeLayer,
                    cfhAnnotation,
                    imageData.examType
                  );
                  const derivedWithValues = derived.map(
                    (m: MeasurementData) => ({
                      ...m,
                      value: calculateMeasurementValue(m.type, m.points),
                    })
                  );
                  setMeasurements(prev => [
                    ...prev.filter(
                      (m: MeasurementData) =>
                        !m.id.startsWith(DERIVED_ID_PREFIX) &&
                        !aiMeasurementIdsRef.current.has(m.id)
                    ),
                    ...derivedWithValues,
                  ]);
                }
              }
              return next;
            });
          }}
          onSave={handleSaveMeasurements}
          onExportJson={exportAnnotationsToJSON}
          onImportJson={importAnnotationsFromJSON}
          onAIMeasure={handleAIMeasurement}
          onGenerateReport={handleReportGenerate}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* 中间影像查看区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-black flex items-center justify-center relative flex-1 overflow-hidden">
              {/* 直接显示ImageCanvas，让它自己处理图像加载状态 */}
              <AnnotationCanvas
                selectedImage={imageData}
                measurements={measurements}
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                onMeasurementAdd={handleAddMeasurement}
                onMeasurementsUpdate={setMeasurements}
                onClearAll={clearAllMeasurements}
                tools={tools}
                clickedPoints={clickedPoints}
                setClickedPoints={setClickedPoints}
                imageId={imageId}
                isSettingStandardDistance={isSettingStandardDistance}
                setIsSettingStandardDistance={setIsSettingStandardDistance}
                standardDistancePoints={standardDistancePoints}
                setStandardDistancePoints={setStandardDistancePoints}
                standardDistance={standardDistance}
                hoveredStandardPointIndex={hoveredStandardPointIndex}
                setHoveredStandardPointIndex={setHoveredStandardPointIndex}
                draggingStandardPointIndex={draggingStandardPointIndex}
                setDraggingStandardPointIndex={setDraggingStandardPointIndex}
                recalculateAVTandTS={(distance, points) =>
                  recalculateAVTandTS(imageNaturalSize, distance, points)
                }
                onImageSizeChange={size => setImageNaturalSize(size)}
                onToolChange={handleToolChange}
                isImagePanLocked={isImagePanLocked}
                pointBindings={pointBindings}
                setPointBindings={setPointBindings}
                selectedBindingGroupId={selectedBindingGroupId}
                centerOnPoint={centerOnPoint}
                onCenterConsumed={() => setCenterOnPoint(null)}
                onCanvasClick={() => {
                  if (!isManualBindingMode) setSelectedBindingGroupId(null);
                }}
                isManualBindingMode={isManualBindingMode}
                manualBindingSelectedPoints={manualBindingSelectedPoints}
                onManualBindingPointToggle={toggleManualBindingPoint}
                vertebraeLayer={activeVertebraeLayer}
                keypoints={isKeypointExam ? keypoints : []}
                cfhAnnotation={cfhAnnotation}
                showVertebraeLayer={showVertebraeLayer}
                onVertebraeUpdate={
                  canUseKeypoints ? handleVertebraeUpdate : undefined
                }
                onVertebraePreviewUpdate={
                  canUseKeypoints ? handleVertebraePreviewUpdate : undefined
                }
                onKeypointAdd={handleKeypointAdd}
                onKeypointDelete={handleKeypointDelete}
              />
            </div>
          </div>

          <AnnotationToolbar
            examType={imageData.examType}
            tools={tools}
            measurements={measurements}
            keypoints={keypoints}
            completeVertebraGroups={completeVertebraGroups}
            canUseKeypointTools={canUseKeypoints}
            selectedTool={selectedTool}
            isSettingStandardDistance={isSettingStandardDistance}
            standardDistance={standardDistance}
            standardDistancePointsLength={standardDistancePoints.length}
            standardDistanceValue={standardDistanceValue}
            reportText={reportText}
            saveMessage={saveMessage}
            pointBindings={pointBindings}
            selectedBindingGroupId={selectedBindingGroupId}
            isBindingPanelOpen={isBindingPanelOpen}
            isManualBindingMode={isManualBindingMode}
            manualBindingSelectedPointsCount={
              manualBindingSelectedPoints.length
            }
            showTagPanel={showTagPanel}
            tags={tags}
            newTag={newTag}
            showAdvicePanel={showAdvicePanel}
            treatmentAdvice={treatmentAdvice}
            automaticToolStatus={automaticToolStatus}
            onSelectTool={toolId => {
              if ((toolId === 'avt' || toolId === 'tts') && !standardDistance) {
                setShowStandardDistanceWarning(true);
                setSelectedTool('hand');
                return;
              }

              handleToolChange(toolId);
              if (isSettingStandardDistance) {
                setIsSettingStandardDistance(false);
                setStandardDistancePoints([]);
              }
            }}
            onRestoreAutomaticMeasurement={handleRestoreAutomaticMeasurement}
            onCreateAvt={handleCreateAvt}
            onCreateCobb={handleCreateCobb}
            onCreateVertebraCenter={handleCreateVertebraCenter}
            onCreateTts={handleCreateTts}
            onActivateHandMode={activateHandMode}
            onToggleImagePanLocked={() =>
              setIsImagePanLocked(!isImagePanLocked)
            }
            isImagePanLocked={isImagePanLocked}
            onToggleBindingPanel={() => setIsBindingPanelOpen(open => !open)}
            onClearBindings={handleClearBindings}
            onStartManualBinding={() => {
              setIsManualBindingMode(true);
              setManualBindingSelectedPoints([]);
            }}
            onCompleteManualBinding={completeManualBinding}
            onCancelManualBinding={cancelManualBinding}
            onSelectBindingGroup={setSelectedBindingGroupId}
            onRemoveBindingGroup={removeBindingGroup}
            onRemoveBindingMember={removeBindingMember}
            onStartStandardDistance={() => {
              setIsSettingStandardDistance(true);
              setStandardDistancePoints([]);
              setSelectedTool('hand');
            }}
            onChangeStandardDistanceValue={setStandardDistanceValue}
            onStandardDistanceInputBlur={() => {
              const value = parseFloat(standardDistanceValue);
              if (
                !isNaN(value) &&
                value > 0 &&
                standardDistancePoints.length === 2
              ) {
                recalculateAVTandTS(
                  imageNaturalSize,
                  value,
                  standardDistancePoints
                );
                setStandardDistance(value);
              }
            }}
            onStandardDistanceInputEnter={() => {
              const value = parseFloat(standardDistanceValue);
              if (
                !isNaN(value) &&
                value > 0 &&
                standardDistancePoints.length === 2
              ) {
                recalculateAVTandTS(
                  imageNaturalSize,
                  value,
                  standardDistancePoints
                );
                setStandardDistance(value);
                setIsSettingStandardDistance(false);
              }
            }}
            onToggleTagPanel={() => setShowTagPanel(!showTagPanel)}
            onChangeNewTag={setNewTag}
            onAddTag={() => {
              if (newTag.trim()) {
                setTags([...tags, newTag.trim()]);
                setNewTag('');
              }
            }}
            onRemoveTag={index =>
              setTags(tags.filter((_, tagIndex) => tagIndex !== index))
            }
            onToggleAdvicePanel={() => setShowAdvicePanel(!showAdvicePanel)}
            onChangeTreatmentAdvice={setTreatmentAdvice}
            onCopyReport={() => {
              navigator.clipboard.writeText(reportText);
              setSaveMessage('报告已复制到剪贴板');
              setTimeout(() => setSaveMessage(''), 2000);
            }}
          />
        </div>
      </div>

      {/* 标准距离未设置警告对话框 */}
      {showStandardDistanceWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <i className="ri-alert-line text-2xl text-yellow-600"></i>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  请先设置标准距离
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  AVT和TTS测量需要先设置标准距离以确保测量准确性。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    操作步骤：
                  </p>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>点击右侧面板中的"标准距离设置"按钮</li>
                    <li>在图像上标注两个已知距离的点</li>
                    <li>输入实际距离值（单位：mm）</li>
                    <li>确认后即可使用AVT/TTS测量工具</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStandardDistanceWarning(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
