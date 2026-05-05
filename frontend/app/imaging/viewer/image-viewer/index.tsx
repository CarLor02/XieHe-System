'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/lib/api';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationToolbar from './components/AnnotationToolbar';
import StudyHeader from './components/StudyHeader';
import { createEmptyBindings } from './domain/annotation-binding';
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
import {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  MeasurementProjectionBinding,
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
import {
  applyManualMeasurementPointsToKeypoints,
  buildMeasurementProjectionBinding,
  deriveDirectMeasurementProjectionsFromKeypoints,
  getExclusiveKeypointsForMeasurementDelete,
  isAuxiliaryAnnotation,
  upsertMeasurementProjectionBinding,
} from './domain/keypoint-measurement-binding';
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
    setMeasurementBindings([]);
    setSuppressedMeasurementIds([]);
    setPendingManualCobbBinding(null);
    setPendingManualVertebraCenter(null);
    setCfhAnnotation(null);
    setShowVertebraeLayer(false);
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
  const [measurementBindings, setMeasurementBindings] = useState<
    MeasurementProjectionBinding[]
  >([]);
  const [suppressedMeasurementIds, setSuppressedMeasurementIds] = useState<
    string[]
  >([]);
  const [pendingManualCobbBinding, setPendingManualCobbBinding] = useState<{
    upperVertebra: string;
    lowerVertebra: string;
  } | null>(null);
  const [pendingManualVertebraCenter, setPendingManualVertebraCenter] =
    useState<string | null>(null);
  const [cfhAnnotation, setCfhAnnotation] = useState<CfhAnnotation | null>(
    null
  );
  const [showVertebraeLayer, setShowVertebraeLayer] = useState(false);
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
    setCfhAnnotation,
    setKeypoints,
    setMeasurementBindings,
    setSuppressedMeasurementIds
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
    setCfhAnnotation,
    setKeypoints,
    setMeasurementBindings,
    setSuppressedMeasurementIds
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
    if (selectedTool !== 'vertebra-center' && pendingManualVertebraCenter) {
      setPendingManualVertebraCenter(null);
    }
  }, [pendingManualVertebraCenter, selectedTool]);

  useEffect(() => {
    if (!isKeypointExam) return;
    if (vertebraeLayer.length === 0) return;

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

  const deriveKeypointMeasurements = useCallback(
    (nextKeypoints: KeypointAnnotation[]): MeasurementData[] => {
      const derivedLayer = keypointsToDerivedLayer(
        nextKeypoints,
        imageData.examType
      );
      const layerMeasurements = deriveAllMeasurements(
        derivedLayer,
        isLateralView ? null : cfhAnnotation,
        imageData.examType
      );
      const directMeasurements = deriveDirectMeasurementProjectionsFromKeypoints(
        nextKeypoints,
        imageData.examType
      );

      return filterUniqueAnnotationDuplicates([
        ...layerMeasurements,
        ...directMeasurements,
      ]).map(m => ({
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
      const suppressedSet = new Set(suppressedMeasurementIds);
      const boundCobbIds = new Set(
        measurementBindings
          .filter(binding => getAnnotationTypeId(binding.type) === 'cobb')
          .map(binding => binding.id)
      );
      const hasExistingDerivedCobb = boundCobbIds.size > 0;
      const derivedWithValues = deriveKeypointMeasurements(
        nextKeypoints
      ).filter(
        measurement =>
          !suppressedSet.has(measurement.id) &&
          (!isDerivedCobbMeasurement(measurement) ||
            (!hasExistingDerivedCobb && !boundCobbIds.has(measurement.id)))
      );

      const boundMeasurements = measurementBindings
        .map(binding => {
          const typeId = getAnnotationTypeId(binding.type);
          if (typeId === 'cobb' && binding.upperVertebra && binding.lowerVertebra) {
            return createCobbMeasurement(
              binding.upperVertebra,
              binding.lowerVertebra,
              nextKeypoints,
              {
                id: binding.id,
                type: 'cobb',
                value: '',
                points: [],
                upperVertebra: binding.upperVertebra,
                lowerVertebra: binding.lowerVertebra,
                apexVertebra: binding.apexVertebra ?? null,
              }
            );
          }
          if (typeId === 'vertebra-center' && binding.upperVertebra) {
            return createVertebraCenterMeasurement(
              binding.upperVertebra,
              nextKeypoints
            );
          }
          if (typeId === 'tts' && binding.upperVertebra && binding.lowerVertebra) {
            return createTtsMeasurement(
              binding.upperVertebra,
              binding.lowerVertebra,
              nextKeypoints
            );
          }
          if (typeId === 'avt' && binding.apexVertebra) {
            return createAvtMeasurement(binding.apexVertebra, nextKeypoints);
          }
          return null;
        })
        .filter(
          (measurement): measurement is MeasurementData => measurement !== null
        )
        .filter(measurement => !suppressedSet.has(measurement.id));

      return filterUniqueAnnotationDuplicates([
        ...previousMeasurements.filter(isAuxiliaryAnnotation),
        ...derivedWithValues,
        ...boundMeasurements,
      ]);
    },
    [
      deriveKeypointMeasurements,
      measurementBindings,
      suppressedMeasurementIds,
    ]
  );

  useEffect(() => {
    if (!isKeypointExam) return;
    setMeasurements(previous =>
      rebuildKeypointMeasurements(previous, keypoints)
    );
  }, [isKeypointExam, keypoints, rebuildKeypointMeasurements, setMeasurements]);

  const handleAddMeasurement = useCallback(
    (toolType: string, points: Point[]) => {
      if (isKeypointExam) {
        const typeId = getAnnotationTypeId(toolType);
        if (typeId === 'cobb' && pendingManualCobbBinding && points.length >= 4) {
          const idSuffix =
            `${pendingManualCobbBinding.upperVertebra}-${pendingManualCobbBinding.lowerVertebra}`.toLowerCase();
          const cobbMeasurementId = `${DERIVED_ID_PREFIX}cobb-bound-${idSuffix}`;
          const nextKeypoints = [
            {
              id: `${pendingManualCobbBinding.upperVertebra}-1`,
              point: points[0],
              source: 'manual' as const,
              confidence: 1,
            },
            {
              id: `${pendingManualCobbBinding.upperVertebra}-2`,
              point: points[1],
              source: 'manual' as const,
              confidence: 1,
            },
            {
              id: `${pendingManualCobbBinding.lowerVertebra}-3`,
              point: points[2],
              source: 'manual' as const,
              confidence: 1,
            },
            {
              id: `${pendingManualCobbBinding.lowerVertebra}-4`,
              point: points[3],
              source: 'manual' as const,
              confidence: 1,
            },
          ].reduce(
            (current, keypoint) => upsertKeypoint(current, keypoint),
            keypoints
          );
          setMeasurementBindings(previous =>
            upsertMeasurementProjectionBinding(previous, {
              id: cobbMeasurementId,
              type: 'cobb',
              upperVertebra: pendingManualCobbBinding.upperVertebra,
              lowerVertebra: pendingManualCobbBinding.lowerVertebra,
              apexVertebra: null,
            })
          );
          setSuppressedMeasurementIds(previous =>
            previous.filter(id => id !== cobbMeasurementId)
          );
          setPendingManualCobbBinding(null);
          setKeypoints(nextKeypoints);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          setMeasurements(previous =>
            rebuildKeypointMeasurements(previous, nextKeypoints)
          );
          setSelectedTool('hand');
          setSaveMessage(
            `Cobb(${pendingManualCobbBinding.upperVertebra}-${pendingManualCobbBinding.lowerVertebra})关键点已更新`
          );
          setTimeout(() => setSaveMessage(''), 2500);
          return;
        }

        if (
          typeId === 'vertebra-center' &&
          pendingManualVertebraCenter &&
          points.length >= 4
        ) {
          const nextKeypoints = [1, 2, 3, 4]
            .map((pointNumber, index) => ({
              id: `${pendingManualVertebraCenter}-${pointNumber}`,
              point: points[index],
              source: 'manual' as const,
              confidence: 1,
            }))
            .reduce(
              (current, keypoint) => upsertKeypoint(current, keypoint),
              keypoints
            );
          const measurement = createVertebraCenterMeasurement(
            pendingManualVertebraCenter,
            nextKeypoints
          );

          if (measurement) {
            const binding = buildMeasurementProjectionBinding(measurement);
            if (binding) {
              setMeasurementBindings(previous =>
                upsertMeasurementProjectionBinding(previous, binding)
              );
              setSuppressedMeasurementIds(previous =>
                previous.filter(id => id !== measurement.id)
              );
            }
            setMeasurements(previous => {
              if (
                previous.some(
                  item =>
                    item.type === 'vertebra-center' &&
                    item.upperVertebra === pendingManualVertebraCenter
                )
              ) {
                return previous;
              }
              return [...previous, measurement];
            });
          }

          setPendingManualVertebraCenter(null);
          setKeypoints(nextKeypoints);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          if (isLateralView) {
            setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
          }
          setSelectedTool('hand');
          setSaveMessage(`${pendingManualVertebraCenter} 椎体中心关键点已更新`);
          setTimeout(() => setSaveMessage(''), 2500);
          return;
        }

        const manualResult = applyManualMeasurementPointsToKeypoints(
          keypoints,
          toolType,
          points,
          imageData.examType
        );
        if (manualResult) {
          const nextKeypoints = manualResult.keypoints;
          const restoredIds = deriveKeypointMeasurements(nextKeypoints)
            .filter(measurement => getAnnotationTypeId(measurement.type) === typeId)
            .map(measurement => measurement.id);
          setSuppressedMeasurementIds(previous =>
            previous.filter(id => !restoredIds.includes(id))
          );
          setKeypoints(nextKeypoints);
          setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
          if (isLateralView) {
            setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
          }
          setMeasurements(previous =>
            rebuildKeypointMeasurements(previous, nextKeypoints)
          );
          setSaveMessage(
            `${getAnnotationConfig(typeId)?.name ?? toolType}关键点已更新`
          );
          setTimeout(() => setSaveMessage(''), 2500);
          return;
        }
      }

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
      isKeypointExam,
      keypoints,
      measurements,
      standardDistance,
      standardDistancePoints,
      tools,
      imageData.examType,
      deriveKeypointMeasurements,
      isLateralView,
      pendingManualCobbBinding,
      pendingManualVertebraCenter,
      rebuildKeypointMeasurements,
      setSelectedTool,
      setSaveMessage,
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

  const handleMeasurementDelete = useCallback(
    (measurementId: string) => {
      const measurement = measurements.find(item => item.id === measurementId);
      if (!measurement) return;

      if (!isKeypointExam || isAuxiliaryAnnotation(measurement)) {
        setMeasurements(previous =>
          previous.filter(item => item.id !== measurementId)
        );
        return;
      }

      const exclusiveKeypointIds = getExclusiveKeypointsForMeasurementDelete(
        measurement,
        measurements,
        keypoints
      );
      const nextKeypoints = exclusiveKeypointIds.reduce(
        (current, keypointId) => deleteKeypoint(current, keypointId),
        keypoints
      );

      setMeasurementBindings(previous =>
        previous.filter(binding => binding.id !== measurementId)
      );
      setSuppressedMeasurementIds(previous =>
        previous.includes(measurementId)
          ? previous
          : [...previous, measurementId]
      );
      applyKeypoints(nextKeypoints);

      if (exclusiveKeypointIds.length > 0) {
        setSaveMessage(
          `已删除 ${exclusiveKeypointIds.length} 个仅由该测量项使用的关键点`
        );
      } else {
        setSaveMessage('该测量项依赖的关键点仍被其他测量项使用，已隐藏该测量项');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [
      applyKeypoints,
      isKeypointExam,
      keypoints,
      measurements,
      setSaveMessage,
    ]
  );

  const handleCreateVertebraCenter = useCallback(
    (vertebra: string) => {
      const measurement = createVertebraCenterMeasurement(vertebra, keypoints);
      if (!measurement) {
        setPendingManualVertebraCenter(vertebra);
        setClickedPoints([]);
        setSelectedTool('vertebra-center');
        setSaveMessage(
          `请依次标注 ${vertebra}-1、${vertebra}-2、${vertebra}-3、${vertebra}-4`
        );
        setTimeout(() => setSaveMessage(''), 4000);
        return;
      }
      setPendingManualVertebraCenter(null);
      const binding = buildMeasurementProjectionBinding(measurement);
      if (binding) {
        setMeasurementBindings(previous =>
          upsertMeasurementProjectionBinding(previous, binding)
        );
        setSuppressedMeasurementIds(previous =>
          previous.filter(id => id !== measurement.id)
        );
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
    [keypoints, setClickedPoints, setSaveMessage, setSelectedTool]
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
      const binding = buildMeasurementProjectionBinding(measurement);
      if (binding) {
        setMeasurementBindings(previous =>
          upsertMeasurementProjectionBinding(
            previous.filter(item => getAnnotationTypeId(item.type) !== 'tts'),
            binding
          )
        );
        setSuppressedMeasurementIds(previous =>
          previous.filter(id => id !== measurement.id)
        );
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
        setPendingManualCobbBinding({ upperVertebra, lowerVertebra });
        setClickedPoints([]);
        setSelectedTool('cobb');
        setSaveMessage(
          `请依次标注 ${upperVertebra} 上终板两点、${lowerVertebra} 下终板两点`
        );
        setTimeout(() => setSaveMessage(''), 4000);
        return;
      }

      const binding = buildMeasurementProjectionBinding(measurement);
      if (binding) {
        setMeasurementBindings(previous =>
          upsertMeasurementProjectionBinding(previous, binding)
        );
        setSuppressedMeasurementIds(previous =>
          previous.filter(id => id !== measurement.id)
        );
      }
      setMeasurements(previous => [
        ...previous.filter(item => item.id !== measurement.id),
        measurement,
      ]);
      setSaveMessage(`已创建 Cobb(${upperVertebra}-${lowerVertebra})`);
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [keypoints, measurements, setClickedPoints, setSelectedTool, setSaveMessage]
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
      const binding = buildMeasurementProjectionBinding(measurement);
      if (binding) {
        setMeasurementBindings(previous =>
          upsertMeasurementProjectionBinding(
            previous.filter(item => getAnnotationTypeId(item.type) !== 'avt'),
            binding
          )
        );
        setSuppressedMeasurementIds(previous =>
          previous.filter(id => id !== measurement.id)
        );
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
      const restoredIds = new Set(missing.map(item => item.id));
      setSuppressedMeasurementIds(previous =>
        previous.filter(id => !restoredIds.has(id))
      );

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

  // 导出标注数据为JSON文件（仅管理员）
  const exportAnnotationsToJSON = () => {
    // 权限检查
    if (!isAdmin) {
      setSaveMessage('无权限：仅管理员可以导出JSON文件');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    try {
      const data = {
        version: 2,
        schema: 'keypoints-only',
        imageId: imageId,
        examType: imageData.examType,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        keypoints,
        auxiliaryAnnotations: measurements.filter(isAuxiliaryAnnotation),
        measurementBindings,
        suppressedMeasurementIds,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints,
        savedAt: new Date().toISOString(),
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

        if (
          data.version !== 2 ||
          data.schema !== 'keypoints-only' ||
          !Array.isArray(data.keypoints)
        ) {
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

        const restoredKeypoints = (data.keypoints as KeypointAnnotation[]).map(
          keypoint => ({
            ...keypoint,
            point: {
              x: keypoint.point.x * scaleX,
              y: keypoint.point.y * scaleY,
            },
          })
        );

        const restoredAuxiliary = Array.isArray(data.auxiliaryAnnotations)
          ? (data.auxiliaryAnnotations as MeasurementData[]).map(item => ({
              ...item,
              points: item.points.map(point => ({
                x: point.x * scaleX,
                y: point.y * scaleY,
              })),
            }))
          : [];

        setKeypoints(restoredKeypoints);
        setVertebraeLayer(keypointsToPersistedLayer(restoredKeypoints));
        setCfhAnnotation(keypointsToCfhAnnotation(restoredKeypoints));
        setMeasurementBindings(
          Array.isArray(data.measurementBindings) ? data.measurementBindings : []
        );
        setSuppressedMeasurementIds(
          Array.isArray(data.suppressedMeasurementIds)
            ? data.suppressedMeasurementIds
            : []
        );
        setMeasurements(restoredAuxiliary);

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
            `已导入 ${restoredKeypoints.length} 个关键点和标准距离 ${data.standardDistance}mm`
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
            `已导入 ${restoredKeypoints.length} 个关键点，未找到标准距离，已设置默认值100mm`
          );
          console.log('导入文件中未找到标准距离，已设置默认值: 100mm');
        } else {
          setSaveMessage(`已导入 ${restoredKeypoints.length} 个关键点`);
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

  // AI测量入口：只调用关键点检测接口，测量结果由关键点推导。
  const handleAIMeasurement = async () => {
    setIsAIMeasuring(true);
    setSaveMessage('AI检测中...');

    try {
      await usecases.aiDetect(
        imageData,
        detectedKeypoints => {
          applyKeypoints(detectedKeypoints);
          setShowVertebraeLayer(canUseKeypoints);
          setSuppressedMeasurementIds([]);
        },
        setSaveMessage,
        setIsAIDetecting
      );
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
            !m.id.startsWith(DERIVED_ID_PREFIX)
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
      keypoints,
      measurements.filter(isAuxiliaryAnnotation),
      measurementBindings,
      suppressedMeasurementIds,
      reportText,
      setIsSaving,
      setSaveMessage
    );
  }, [
    imageId,
    studyData,
    imageNaturalSize,
    standardDistance,
    standardDistancePoints,
    keypoints,
    measurements,
    measurementBindings,
    suppressedMeasurementIds,
    reportText,
  ]);

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
        <StudyHeader
          imageData={imageData}
          saveMessage={saveMessage}
          measurementsLength={measurements.length + keypoints.length}
          isSaving={isSaving}
          canSave={studyData !== null}
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
                        !m.id.startsWith(DERIVED_ID_PREFIX)
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
                onMeasurementDelete={handleMeasurementDelete}
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
                canUseKeypointTools={canUseKeypoints}
                pendingManualVertebraCenter={pendingManualVertebraCenter}
                onVertebraeUpdate={handleVertebraeUpdate}
                onVertebraePreviewUpdate={handleVertebraePreviewUpdate}
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
