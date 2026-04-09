'use client';

import { useEffect, useRef, useState } from 'react';
import { Point, Measurement } from '../types';
import {
  AnnotationBindings,
  PointRef,
  applyPointBindings,
  cleanupBindings,
  getBindingIndicatorColor,
  getSyncGroupsForPoint,
} from '../domain/annotation-binding';
import { CalculationContext, getAnnotationConfig } from '../catalog/annotation-catalog';
import {
  calculateMeasurementValue as calcMeasurementValue,
} from '../domain/annotation-calculation';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
  getEffectivePointsNeeded,
  getInheritedPoints,
} from '../domain/annotation-inheritance';
import {
  getColorForType,
  getDescriptionForType as getDesc,
  getLabelPositionForType,
  renderSpecialSVGElements,
} from '../domain/annotation-metadata';
import {
  isCircleClicked,
  isEllipseClicked,
  isLineClicked,
  isPolygonClicked,
  isRectangleClicked,
} from '../canvas/hit-test/shape-hit-test';
import { isAuxiliaryShape as checkIsAuxiliaryShape } from '../canvas/tools/tool-state';
import {
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,
} from '../canvas/transform/coordinate-transform';
import {
  INTERACTION_CONSTANTS,
  TEXT_LABEL_CONSTANTS,
} from '../shared/constants';
import {
  calculateDistance,
  calculateQuadrilateralCenter,
  pointToLineDistance,
} from '../shared/geometry';
import { estimateTextHeight, estimateTextWidth } from '../shared/labels';
import { TransformContext } from '../types';

export default function AnnotationCanvas({
  selectedImage,
  measurements,
  selectedTool,
  setSelectedTool,
  onMeasurementAdd,
  onMeasurementsUpdate,
  onClearAll,
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
  recalculateAVTandTS,
  onImageSizeChange,
  onToolChange,
  isImagePanLocked,
  pointBindings,
  setPointBindings,
  selectedBindingGroupId,
  centerOnPoint,
  onCenterConsumed,
  onCanvasClick,
  isManualBindingMode,
  manualBindingSelectedPoints,
  onManualBindingPointToggle,
}: {
  selectedImage: any;
  measurements: Measurement[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  onMeasurementsUpdate: (measurements: Measurement[]) => void;
  onClearAll: () => void;
  tools: any[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  imageId: string;
  isSettingStandardDistance: boolean;
  setIsSettingStandardDistance: (value: boolean) => void;
  standardDistancePoints: Point[];
  setStandardDistancePoints: (points: Point[]) => void;
  standardDistance: number | null;
  hoveredStandardPointIndex: number | null;
  setHoveredStandardPointIndex: (index: number | null) => void;
  draggingStandardPointIndex: number | null;
  setDraggingStandardPointIndex: (index: number | null) => void;
  recalculateAVTandTS: (distance?: number, points?: Point[]) => void;
  onImageSizeChange: (size: { width: number; height: number }) => void;
  onToolChange: (tool: string) => void;
  isImagePanLocked: boolean;
  pointBindings: AnnotationBindings;
  setPointBindings: (bindings: AnnotationBindings) => void;
  selectedBindingGroupId: string | null;
  centerOnPoint: Point | null;
  onCenterConsumed: () => void;
  onCanvasClick: () => void;
  isManualBindingMode: boolean;
  manualBindingSelectedPoints: PointRef[];
  onManualBindingPointToggle: (
    annotationId: string,
    pointIndex: number
  ) => void;
}) {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showResults, setShowResults] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // 鼠标当前图像坐标（用于辅助线段的动态预览）
  const [liveMouseImagePoint, setLiveMouseImagePoint] = useState<Point | null>(
    null
  );

  // 居中显示指定图像坐标点
  useEffect(() => {
    if (!centerOnPoint || !imageNaturalSize) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // 计算 object-contain 的实际显示尺寸（与 coordinateTransform.ts 保持一致）
    const containerAspect = rect.width / rect.height;
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    let displayWidth: number, displayHeight: number;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
    }

    const scaleX = displayWidth / imageNaturalSize.width;
    const scaleY = displayHeight / imageNaturalSize.height;
    const imageCenterX = imageNaturalSize.width / 2;
    const imageCenterY = imageNaturalSize.height / 2;

    setImagePosition({
      x: -(centerOnPoint.x - imageCenterX) * scaleX * imageScale,
      y: -(centerOnPoint.y - imageCenterY) * scaleY * imageScale,
    });
    onCenterConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerOnPoint]);

  // 图像调整参数
  const [brightness, setBrightness] = useState(0); // -100 to 100
  const [contrast, setContrast] = useState(0); // -100 to 100

  const [adjustMode, setAdjustMode] = useState<
    'none' | 'zoom' | 'brightness' | 'contrast'
  >('none');
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // 绘制状态
  const [drawingState, setDrawingState] = useState<{
    isDrawing: boolean;
    startPoint: Point | null;
    currentPoint: Point | null;
  }>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
  });

  // 选中状态 - 重新设计的选中系统（优化：合并为一个对象状态）
  const [selectionState, setSelectionState] = useState<{
    measurementId: string | null;
    pointIndex: number | null;
    type: 'point' | 'whole' | null;
    isDragging: boolean;
    dragOffset: { x: number; y: number };
  }>({
    measurementId: null,
    pointIndex: null,
    type: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  });

  // 约束辅助水平/垂直线第二点，保证线段方向正确
  const constrainAuxLinePoint = (
    toolId: string,
    anchor: Point,
    rawPoint: Point
  ): Point => {
    if (toolId === 'aux-horizontal-line') {
      return { x: rawPoint.x, y: anchor.y };
    }
    if (toolId === 'aux-vertical-line') {
      return { x: anchor.x, y: rawPoint.y };
    }
    return rawPoint;
  };

  // 参考线状态管理（优化：合并为一个对象状态）
  const [referenceLines, setReferenceLines] = useState<{
    t1Tilt: Point | null; // T1 tilt 水平参考线
    ca: Point | null; // CA 水平参考线
    pelvic: Point | null; // Pelvic 水平参考线
    sacral: Point | null; // Sacral 水平参考线
    avt: Point | null; // AVT 第一条垂直线
    ts: Point | null; // TS 第一条垂直线
    lld: Point | null; // LLD 第一条水平线
    ss: Point | null; // SS（骶骨倾斜角）水平参考线
    sva: Point | null; // SVA（矢状面垂直轴）第一条垂直线
    horizontalLine: Point | null; // 辅助水平线
    verticalLine: Point | null; // 辅助垂直线
  }>({
    t1Tilt: null,
    ca: null,
    pelvic: null,
    sacral: null,
    avt: null,
    ts: null,
    lld: null,
    ss: null,
    sva: null,
    horizontalLine: null,
    verticalLine: null,
  });

  // 悬浮高亮状态 - 用于预览即将被选中的元素（优化：合并为一个对象状态）
  const [hoverState, setHoverState] = useState<{
    measurementId: string | null;
    pointIndex: number | null;
    elementType: 'point' | 'whole' | null;
  }>({
    measurementId: null,
    pointIndex: null,
    elementType: null,
  });

  // 隐藏标注状态 - 用于控制标注标识的显示/隐藏
  const [hiddenMeasurementIds, setHiddenMeasurementIds] = useState<Set<string>>(
    new Set()
  );
  const [hideAllLabels, setHideAllLabels] = useState(false);

  // 隐藏整个标注状态 - 用于控制整个标注（图形+标识）的显示/隐藏
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(
    new Set()
  );
  const [hideAllAnnotations, setHideAllAnnotations] = useState(false);

  // 标准距离可见性状态
  const [isStandardDistanceHidden, setIsStandardDistanceHidden] =
    useState(false);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    measurementId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    measurementId: null,
  });

  // 文字编辑对话框状态
  const [editLabelDialog, setEditLabelDialog] = useState<{
    visible: boolean;
    measurementId: string | null;
    currentLabel: string;
  }>({
    visible: false,
    measurementId: null,
    currentLabel: '',
  });

  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

  // 监听工具切换，清理参考线状态（优化：使用referenceLines）
  useEffect(() => {
    setReferenceLines(prev => ({
      ...prev,
      t1Tilt: selectedTool.includes('t1-tilt') ? prev.t1Tilt : null,
      ca: selectedTool.includes('ca') ? prev.ca : null,
      pelvic: selectedTool.includes('pelvic') ? prev.pelvic : null,
      sacral: selectedTool.includes('sacral') ? prev.sacral : null,
      avt: selectedTool.includes('avt') ? prev.avt : null,
      ts: selectedTool.includes('ts') ? prev.ts : null,
      lld: selectedTool.includes('lld') ? prev.lld : null,
    }));
    // 工具切换时清空当前点击的点
    setClickedPoints([]);
  }, [selectedTool]);

  // 清空所有标注
  const handleClear = () => {
    // 显示确认对话框
    if (window.confirm('确定要清空所有标注吗？此操作无法撤销。')) {
      // 清空父组件的测量数据（包括所有测量和辅助图形）
      onClearAll();

      // 清空当前正在绘制的点
      setClickedPoints([]);
    }
  };

  // 创建坐标转换上下文
  const getTransformContext = (): TransformContext => ({
    imageNaturalSize,
    imagePosition,
    imageScale,
  });

  // 坐标转换函数：将图像坐标系转换为屏幕坐标系
  // 使用工具函数库中的实现
  const imageToScreen = (point: Point): Point => {
    return utilImageToScreen(point, getTransformContext());
  };

  // 坐标转换函数：将屏幕坐标系转换为图像坐标系
  // 使用工具函数库中的实现
  const screenToImage = (screenX: number, screenY: number): Point => {
    return utilScreenToImage(screenX, screenY, getTransformContext());
  };

  // 计算函数已移至annotationConfig.ts中

  // 获取图像数据
  useEffect(() => {
    let currentImageUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setImageLoading(true);
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';

        // 使用fetch API直接获取，确保认证头被正确传递
        const { accessToken } =
          require('../../../../../store/authStore').useAuthStore.getState();

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiUrl}/api/v1/image-files/${numericId}/download`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const imageBlob = await response.blob();
        const imageObjectUrl = URL.createObjectURL(imageBlob);
        currentImageUrl = imageObjectUrl;
        setImageUrl(imageObjectUrl);
      } catch (error) {
        console.error('获取图像失败:', error);
        setImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchImage();

    // 清理函数：释放blob URL
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [imageId]);

  // 实际所需点击次数（扣除可从其他标注继承的点位）
  const pointsNeeded = currentTool
    ? getEffectivePointsNeeded(
        currentTool.id,
        currentTool.pointsNeeded,
        measurements
      )
    : 2;

  const handleMouseEnter = () => {
    setIsHovering(true);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsDragging(false);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 左键点击时通知父组件取消共享点选中状态
    if (e.button === 0) onCanvasClick();
    // 🔒 安全检查：图像未加载完成时，禁止所有交互操作
    if (!imageNaturalSize) {
      console.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 手动绑定模式：左键点击标注点以选中/取消选中
    if (isManualBindingMode && e.button === 0) {
      const clickRadius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS;
      const screenPt = { x, y };
      for (const measurement of measurements) {
        if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id))
          continue;
        for (let i = 0; i < measurement.points.length; i++) {
          const ps = imageToScreen(measurement.points[i]);
          if (calculateDistance(screenPt, ps) < clickRadius) {
            onManualBindingPointToggle(measurement.id, i);
            return;
          }
        }
      }
      // 点击了空白区域：不触发拖拽或其他操作
      return;
    }

    // 优先处理标准距离设置模式
    if (isSettingStandardDistance && e.button === 0) {
      const imagePoint = screenToImage(x, y);

      // 检查是否点击了已有的标准距离点（用于拖拽）
      if (standardDistancePoints.length === 2) {
        const clickRadius = 10; // 屏幕像素，与其他标注点保持一致

        for (let i = 0; i < standardDistancePoints.length; i++) {
          const point = standardDistancePoints[i];
          const pointScreen = imageToScreen(point);
          const distance = Math.sqrt(
            Math.pow(x - pointScreen.x, 2) + Math.pow(y - pointScreen.y, 2)
          );

          if (distance < clickRadius) {
            setDraggingStandardPointIndex(i);
            return; // 开始拖拽，阻止其他逻辑
          }
        }
      }

      // 如果未点击已有点，且点数未满2个，则添加新点
      if (standardDistancePoints.length < 2) {
        const newPoints = [...standardDistancePoints, imagePoint];
        setStandardDistancePoints(newPoints);

        // 如果标注了两个点，自动结束设置模式
        if (newPoints.length === 2) {
          setIsSettingStandardDistance(false);
        }
      }

      return; // 阻止其他逻辑执行
    }

    // 在hand模式下，允许拖拽标准距离点（即使不在设置模式）
    if (
      selectedTool === 'hand' &&
      e.button === 0 &&
      standardDistancePoints.length === 2
    ) {
      const clickRadius = 10; // 屏幕像素，与其他标注点保持一致

      for (let i = 0; i < standardDistancePoints.length; i++) {
        const point = standardDistancePoints[i];
        const pointScreen = imageToScreen(point);
        const distance = Math.sqrt(
          Math.pow(x - pointScreen.x, 2) + Math.pow(y - pointScreen.y, 2)
        );

        if (distance < clickRadius) {
          setDraggingStandardPointIndex(i);
          return; // 开始拖拽，阻止其他逻辑
        }
      }
    }

    // 按住左键时的调整模式
    if (e.button === 0) {
      // 左键按下
      setDragStartPos({ x: e.clientX, y: e.clientY });

      // 根据当前工具判断调整模式
      if (selectedTool === 'hand') {
        const imagePoint = screenToImage(x, y);

        // 注意：几何计算函数已移至工具函数库，直接使用导入的函数

        // 先检查是否点击了已有的测量结果或点
        let foundSelection = false;
        let selectedMeasurement: any = null;
        let selectedPointIdx: number | null = null;
        let selType: 'point' | 'whole' | null = null;

        // 点击阈值（屏幕像素）- 使用常量
        const screenPoint = { x, y };
        const pointClickRadius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS;
        const lineClickRadius = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS;

        // 1. 检查是否点击了已完成的测量结果
        for (const measurement of measurements) {
          // 跳过被隐藏的标注（标注整体被隐藏时，不响应任何鼠标事件）
          if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id)) {
            continue;
          }

          const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);

          // 1.1 检查是否点击了任意点 - 优先级最高
          // 检查所有点，包括圆形和椭圆的点
          for (let i = 0; i < measurement.points.length; i++) {
            const point = measurement.points[i];
            const pointScreen = imageToScreen(point);
            // 使用工具函数计算距离
            const distance = calculateDistance(screenPoint, pointScreen);
            if (distance < pointClickRadius) {
              selectedMeasurement = measurement;
              selectedPointIdx = i;
              selType = 'point';
              foundSelection = true;
              break;
            }
          }

          // 1.2 如果没有点击到点，检查是否点击了文字标识区域或辅助图形内部区域
          if (!foundSelection) {
            if (isAuxiliaryShape) {
              // 辅助图形:检查是否点击了图形边界线条（使用屏幕坐标）

              if (
                measurement.type === '圆形标注' &&
                measurement.points.length === 2
              ) {
                // 圆形:检查是否点击了圆边界 - 使用工具函数
                const context = getTransformContext();
                if (
                  isCircleClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '椭圆标注' &&
                measurement.points.length === 2
              ) {
                // 椭圆:检查是否点击了椭圆边界 - 使用工具函数
                const context = getTransformContext();
                if (
                  isEllipseClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '矩形标注' &&
                measurement.points.length === 2
              ) {
                // 矩形:检查是否点击了矩形边界 - 使用工具函数
                const context = getTransformContext();
                if (
                  isRectangleClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '多边形标注' &&
                measurement.points.length >= 3
              ) {
                // 多边形:检查是否点击了任意一条边 - 使用工具函数
                const context = getTransformContext();
                if (
                  isPolygonClicked(
                    screenPoint,
                    measurement.points,
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '箭头标注' &&
                measurement.points.length >= 2
              ) {
                // 箭头:检查是否点击了箭头线段 - 使用工具函数
                const context = getTransformContext();
                if (
                  isLineClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '锥体中心' &&
                measurement.points.length === 4
              ) {
                // 锥体中心:检查是否点击了四边形的任意一条边或中心点
                const context = getTransformContext();
                // 检查四边形边缘
                if (
                  isPolygonClicked(
                    screenPoint,
                    measurement.points,
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                } else {
                  // 检查中心点
                  const center = calculateQuadrilateralCenter(
                    measurement.points
                  );
                  const centerScreen = imageToScreen(center);
                  const distToCenter = calculateDistance(
                    screenPoint,
                    centerScreen
                  );
                  if (distToCenter < 15) {
                    // 中心点点击范围稍大一些
                    selectedMeasurement = measurement;
                    selType = 'whole';
                    foundSelection = true;
                  }
                }
              } else if (
                measurement.type === '距离标注' &&
                measurement.points.length === 2
              ) {
                // 距离标注:检查是否点击了线段
                const context = getTransformContext();
                if (
                  isLineClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                (measurement.type === '辅助水平线' ||
                  measurement.type === '辅助垂直线') &&
                measurement.points.length === 2
              ) {
                // 辅助水平/垂直线段:检查是否点击了线段
                const context = getTransformContext();
                if (
                  isLineClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (
                measurement.type === '角度标注' &&
                measurement.points.length === 3
              ) {
                // 角度标注:检查是否点击了两条线段
                const context = getTransformContext();
                if (
                  isLineClicked(
                    screenPoint,
                    measurement.points[0],
                    measurement.points[1],
                    context,
                    lineClickRadius
                  ) ||
                  isLineClicked(
                    screenPoint,
                    measurement.points[1],
                    measurement.points[2],
                    context,
                    lineClickRadius
                  )
                ) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              }
            } else {
              // 非辅助图形:检查文字标识区域（使用屏幕坐标）
              // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标，然后转换为屏幕坐标
              const labelPosInImage = getLabelPositionForType(
                measurement.type,
                measurement.points,
                imageScale
              );
              const labelPosInScreen = imageToScreen(labelPosInImage);
              const textBaselineX = labelPosInScreen.x;
              const textBaselineY = labelPosInScreen.y;

              const textContent = `${measurement.type}: ${measurement.value}`;
              // 使用工具函数估算文字尺寸
              const textWidth = estimateTextWidth(
                textContent,
                TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE
              );
              const textHeight = estimateTextHeight(
                TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE
              );
              const textTop = textBaselineY - textHeight / 2;
              const textBottom = textBaselineY + textHeight / 2;

              if (
                screenPoint.x >= textBaselineX - textWidth / 2 &&
                screenPoint.x <= textBaselineX + textWidth / 2 &&
                screenPoint.y >= textTop &&
                screenPoint.y <= textBottom
              ) {
                selectedMeasurement = measurement;
                selType = 'whole';
                foundSelection = true;
              }
            }
          }

          if (foundSelection) {
            // 优化：一次性更新所有选中状态
            if (selType === 'point') {
              // 选中单个点（dragOffset仍使用图像坐标）
              const point = selectedMeasurement.points[selectedPointIdx!];
              const imagePoint = screenToImage(x, y);
              setSelectionState({
                measurementId: selectedMeasurement.id,
                pointIndex: selectedPointIdx,
                type: selType,
                isDragging: false,
                dragOffset: {
                  x: imagePoint.x - point.x,
                  y: imagePoint.y - point.y,
                },
              });
            } else {
              // 选中整个测量结果（dragOffset仍使用图像坐标）
              const xs = selectedMeasurement.points.map((p: Point) => p.x);
              const ys = selectedMeasurement.points.map((p: Point) => p.y);
              const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
              const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
              const imagePoint = screenToImage(x, y);
              setSelectionState({
                measurementId: selectedMeasurement.id,
                pointIndex: null,
                type: selType,
                isDragging: false,
                dragOffset: {
                  x: imagePoint.x - centerX,
                  y: imagePoint.y - centerY,
                },
              });
            }
            break;
          }
        }

        // 2. 检查是否点击了正在绘制的点
        if (!foundSelection && clickedPoints.length > 0) {
          for (let i = 0; i < clickedPoints.length; i++) {
            const point = clickedPoints[i];
            const pointScreen = imageToScreen(point);
            const distance = Math.sqrt(
              Math.pow(screenPoint.x - pointScreen.x, 2) +
                Math.pow(screenPoint.y - pointScreen.y, 2)
            );
            if (distance < pointClickRadius) {
              // 优化：选中标准距离点
              const imagePoint = screenToImage(x, y);
              setSelectionState({
                measurementId: null,
                pointIndex: i,
                type: 'point',
                isDragging: false,
                dragOffset: {
                  x: imagePoint.x - point.x,
                  y: imagePoint.y - point.y,
                },
              });
              foundSelection = true;
              break;
            }
          }
        }

        // 3. 如果没有点击到任何对象,检查是否点击了已选中对象的允许拖拽区域内
        if (!foundSelection && selectionState.measurementId) {
          const measurement = measurements.find(
            m => m.id === selectionState.measurementId
          );
          if (measurement && measurement.points.length > 0) {
            // 如果是点级别选择，只允许在选中点的选中框内拖拽
            if (
              selectionState.type === 'point' &&
              selectionState.pointIndex !== null
            ) {
              const selectedPoint =
                measurement.points[selectionState.pointIndex];

              // 计算选中框范围（与绘制逻辑一致）
              const screenPoint = imageToScreen(selectedPoint);
              const selectionBoxMinX = screenPoint.x - 15;
              const selectionBoxMaxX = screenPoint.x + 15;
              const selectionBoxMinY = screenPoint.y - 15;
              const selectionBoxMaxY = screenPoint.y + 15;

              // 将当前鼠标位置转换为屏幕坐标
              const mouseScreenPoint = imageToScreen(imagePoint);

              // 检查是否在选中框内
              if (
                mouseScreenPoint.x >= selectionBoxMinX &&
                mouseScreenPoint.x <= selectionBoxMaxX &&
                mouseScreenPoint.y >= selectionBoxMinY &&
                mouseScreenPoint.y <= selectionBoxMaxY
              ) {
                // 在选中框内,可以拖拽（优化：更新dragOffset）
                setSelectionState({
                  ...selectionState,
                  dragOffset: {
                    x: imagePoint.x - selectedPoint.x,
                    y: imagePoint.y - selectedPoint.y,
                  },
                });
                foundSelection = true;
              }
            } else if (selectionState.type === 'whole') {
              // 整体选择模式下，允许在整个测量结果的选中框内拖拽

              // 计算整体选中框范围（与绘制逻辑一致）
              let selectionBoxMinX: number, selectionBoxMaxX: number;
              let selectionBoxMinY: number, selectionBoxMaxY: number;

              // 对圆形和椭圆使用特殊的选中框计算
              if (
                measurement.type === '圆形标注' &&
                measurement.points.length >= 2
              ) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const screenCenter = imageToScreen(center);
                const screenEdge = imageToScreen(edge);
                const screenRadius = Math.sqrt(
                  Math.pow(screenEdge.x - screenCenter.x, 2) +
                    Math.pow(screenEdge.y - screenCenter.y, 2)
                );
                selectionBoxMinX = screenCenter.x - screenRadius - 15;
                selectionBoxMaxX = screenCenter.x + screenRadius + 15;
                selectionBoxMinY = screenCenter.y - screenRadius - 15;
                selectionBoxMaxY = screenCenter.y + screenRadius + 15;
              } else if (
                measurement.type === '椭圆标注' &&
                measurement.points.length >= 2
              ) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const screenCenter = imageToScreen(center);
                const screenEdge = imageToScreen(edge);
                const screenRadiusX = Math.abs(screenEdge.x - screenCenter.x);
                const screenRadiusY = Math.abs(screenEdge.y - screenCenter.y);
                selectionBoxMinX = screenCenter.x - screenRadiusX - 15;
                selectionBoxMaxX = screenCenter.x + screenRadiusX + 15;
                selectionBoxMinY = screenCenter.y - screenRadiusY - 15;
                selectionBoxMaxY = screenCenter.y + screenRadiusY + 15;
              } else {
                // 其他类型：基于所有点的边界框
                const screenPoints = measurement.points.map(p =>
                  imageToScreen(p)
                );
                const xs = screenPoints.map(p => p.x);
                const ys = screenPoints.map(p => p.y);
                selectionBoxMinX = Math.min(...xs) - 15;
                selectionBoxMaxX = Math.max(...xs) + 15;
                selectionBoxMinY = Math.min(...ys) - 15;
                selectionBoxMaxY = Math.max(...ys) + 15;
              }

              // 将当前鼠标位置转换为屏幕坐标
              const mouseScreenPoint = imageToScreen(imagePoint);

              // 检查是否在选中框内
              if (
                mouseScreenPoint.x >= selectionBoxMinX &&
                mouseScreenPoint.x <= selectionBoxMaxX &&
                mouseScreenPoint.y >= selectionBoxMinY &&
                mouseScreenPoint.y <= selectionBoxMaxY
              ) {
                // 在选中框内,重新计算到中心的偏移（优化：更新dragOffset）
                const centerX =
                  (Math.min(...measurement.points.map(p => p.x)) +
                    Math.max(...measurement.points.map(p => p.x))) /
                  2;
                const centerY =
                  (Math.min(...measurement.points.map(p => p.y)) +
                    Math.max(...measurement.points.map(p => p.y))) /
                  2;
                setSelectionState({
                  ...selectionState,
                  dragOffset: {
                    x: imagePoint.x - centerX,
                    y: imagePoint.y - centerY,
                  },
                });
                foundSelection = true;
              }
            }
          }
        }

        // 4. 如果没有点击到任何对象且不在已选中对象的边界框内,则取消选中并进入拖拽图像模式
        if (!foundSelection) {
          // 优化：清空所有选中状态
          setSelectionState({
            measurementId: null,
            pointIndex: null,
            type: null,
            isDragging: false,
            dragOffset: { x: 0, y: 0 },
          });
          setAdjustMode('zoom');
          setIsDragging(true);
          setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y });
        }
      } else if (
        selectedTool === 'circle' ||
        selectedTool === 'ellipse' ||
        selectedTool === 'rectangle' ||
        selectedTool === 'arrow'
      ) {
        // 辅助图形绘制模式
        const imagePoint = screenToImage(x, y);
        setDrawingState({
          isDrawing: true,
          startPoint: imagePoint,
          currentPoint: imagePoint,
        });
      } else if (selectedTool === 'polygon') {
        // 多边形绘制模式 - 使用 clickedPoints 来管理点，这样可以使用点级别的撤销/回退
        const imagePoint = screenToImage(x, y);

        // 检查是否点击接近第一个点（自动闭合）
        if (clickedPoints.length >= 3) {
          const firstPoint = clickedPoints[0];
          const distance = Math.sqrt(
            Math.pow(imagePoint.x - firstPoint.x, 2) +
              Math.pow(imagePoint.y - firstPoint.y, 2)
          );
          // 如果距离第一个点小于10个图像像素，自动完成多边形
          if (distance < 10 / imageScale) {
            completePolygon();
            return;
          }
        }

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);
      } else if (selectedTool === 'vertebra-center') {
        // 锥体中心绘制模式 - 点击4个角点
        const imagePoint = screenToImage(x, y);

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);

        // 如果已经点击了4个点，自动完成
        if (newPoints.length === 4) {
          onMeasurementAdd('锥体中心', newPoints);
          setClickedPoints([]);
        }
      } else if (selectedTool === 'aux-length') {
        // 距离标注绘制模式 - 点击2个点
        const imagePoint = screenToImage(x, y);

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);

        // 如果已经点击了2个点，自动完成
        if (newPoints.length === 2) {
          onMeasurementAdd('距离标注', newPoints);
          setClickedPoints([]);
        }
      } else if (selectedTool === 'aux-angle') {
        // 角度标注绘制模式 - 点击4个点（两条线段）
        const imagePoint = screenToImage(x, y);

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);

        // 如果已经点击了4个点，自动完成
        if (newPoints.length === 4) {
          onMeasurementAdd('角度标注', newPoints);
          setClickedPoints([]);
        }
      } else if (
        selectedTool === 'aux-horizontal-line' ||
        selectedTool === 'aux-vertical-line'
      ) {
        // 辅助水平/垂直线段：2点完成，第二点自动约束到水平/垂直方向
        const imagePoint = screenToImage(x, y);
        const nextPoint =
          clickedPoints.length === 1
            ? constrainAuxLinePoint(selectedTool, clickedPoints[0], imagePoint)
            : imagePoint;

        const newPoints = [...clickedPoints, nextPoint];
        setClickedPoints(newPoints);

        if (newPoints.length === 2) {
          const currentTool = tools.find(t => t.id === selectedTool);
          if (currentTool) {
            onMeasurementAdd(currentTool.name, newPoints);
            setClickedPoints([]);
          }
        }
      } else {
        // 其他工具时，检查是否点击了已有的点（用于删除）
        // 或者开始调整亮度和对比度

        // 计算相对于图像的坐标（考虑缩放和平移）
        const imagePoint = screenToImage(x, y);

        // 检查是否点击了已有的点（点击范围：5像素）
        let clickedExistingPoint = false;
        for (let i = 0; i < clickedPoints.length; i++) {
          const point = clickedPoints[i];
          const distance = Math.sqrt(
            Math.pow(imagePoint.x - point.x, 2) +
              Math.pow(imagePoint.y - point.y, 2)
          );
          if (distance < 5 / imageScale) {
            // 点击了已有的点，删除它
            const newPoints = clickedPoints.filter((_, idx) => idx !== i);
            setClickedPoints(newPoints);
            clickedExistingPoint = true;
            break;
          }
        }

        // 如果没有点击已有的点，则添加新点
        if (!clickedExistingPoint) {
          // TTS 特殊处理：第二个点约束为水平线（Y坐标与第一个点相同）
          let finalPoint = imagePoint;
          if (selectedTool.includes('ts') && clickedPoints.length === 1) {
            finalPoint = { x: imagePoint.x, y: clickedPoints[0].y };
          }

          const newPoints = [...clickedPoints, finalPoint];
          setClickedPoints(newPoints);

          // T1 Tilt 特殊处理（优化：使用referenceLines）
          if (selectedTool.includes('t1-tilt')) {
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, t1Tilt: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, t1Tilt: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('t1-slope')) {
            // T1 Slope 特殊处理（侧位）（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, t1Tilt: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, t1Tilt: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('ca')) {
            // CA 特殊处理（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, ca: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, ca: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('pelvic')) {
            // Pelvic 特殊处理（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, pelvic: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, pelvic: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('sacral')) {
            // Sacral 特殊处理（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, sacral: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, sacral: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('ss')) {
            // SS（骶骨倾斜角）特殊处理 - 侧位（优化：使用referenceLines）
            const currentTool = tools.find(t => t.id === selectedTool);
            if (currentTool) {
              const asymRules = POINT_INHERITANCE_RULES[currentTool.id] || [];
              const inheritedMap = new Map<number, Point>(); // destinationIndex -> point

              for (const rule of asymRules) {
                const source = measurements.find(m => m.type === rule.fromType);
                if (source) {
                  for (let i = 0; i < rule.sourcePointIndices.length; i++) {
                    const srcIdx = rule.sourcePointIndices[i];
                    const dstIdx = rule.destinationPointIndices[i];
                    if (srcIdx < source.points.length) {
                      inheritedMap.set(dstIdx, source.points[srcIdx]);
                    }
                  }
                }
              }

              // SS 也要参与 S1 上缘共享点复用，确保可从 L1-S1 / L4-S1 / PI / PT / TPA 回用同一组 S1 两点
              for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
                const my = group.participants.find(
                  p => p.toolId === currentTool.id
                );
                if (!my || inheritedMap.has(my.pointIndex)) continue;

                for (const participant of group.participants) {
                  if (participant.toolId === currentTool.id) continue;
                  const source = measurements.find(
                    m => m.type === participant.typeName
                  );
                  if (source && participant.pointIndex < source.points.length) {
                    inheritedMap.set(
                      my.pointIndex,
                      source.points[participant.pointIndex]
                    );
                    break;
                  }
                }
              }

              const effectiveNeeded =
                currentTool.pointsNeeded - inheritedMap.size;
              if (newPoints.length === 1) {
                // 第一个手动点：设置水平参考线位置
                setReferenceLines(prev => ({ ...prev, ss: imagePoint }));
              }

              if (newPoints.length === effectiveNeeded) {
                // 按索引位置组装完整2点（继承点与手动点混合）
                const allPoints: Point[] = [];
                let userPointIndex = 0;
                for (let i = 0; i < currentTool.pointsNeeded; i++) {
                  if (inheritedMap.has(i)) {
                    allPoints[i] = inheritedMap.get(i)!;
                  } else {
                    allPoints[i] = newPoints[userPointIndex++];
                  }
                }

                onMeasurementAdd(currentTool.name, allPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, ss: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('sva')) {
            // SVA（矢状面垂直轴）特殊处理：5个点标注
            // 前4个点：锥体中心的四角点，第5个点：参考点
            const currentTool = tools.find(t => t.id === selectedTool);
            if (currentTool) {
              const asymRules = POINT_INHERITANCE_RULES[currentTool.id] || [];
              const inheritedMap = new Map<number, Point>(); // destinationIndex -> point

              for (const rule of asymRules) {
                const source = measurements.find(m => m.type === rule.fromType);
                if (source) {
                  for (let i = 0; i < rule.sourcePointIndices.length; i++) {
                    const srcIdx = rule.sourcePointIndices[i];
                    const dstIdx = rule.destinationPointIndices[i];
                    if (srcIdx < source.points.length) {
                      inheritedMap.set(dstIdx, source.points[srcIdx]);
                    }
                  }
                }
              }

              const effectiveNeeded =
                currentTool.pointsNeeded - inheritedMap.size;
              if (newPoints.length === 1) {
                // 第一个手动点：设置参考线
                setReferenceLines(prev => ({ ...prev, sva: imagePoint }));
              }

              if (newPoints.length === effectiveNeeded) {
                // 按索引位置组装完整5点（继承点与手动点混合）
                const allPoints: Point[] = [];
                let userPointIndex = 0;
                for (let i = 0; i < currentTool.pointsNeeded; i++) {
                  if (inheritedMap.has(i)) {
                    allPoints[i] = inheritedMap.get(i)!;
                  } else {
                    allPoints[i] = newPoints[userPointIndex++];
                  }
                }

                onMeasurementAdd(currentTool.name, allPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, sva: null })); // 清除参考线
              }
            }
          } else if (selectedTool.includes('avt')) {
            // AVT 特殊处理 - 两条垂直线的距离测量（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setReferenceLines(prev => ({ ...prev, avt: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, avt: null })); // 清除第一条垂直线
              }
            }
          } else if (selectedTool.includes('ts')) {
            // TTS 特殊处理（4点法）：
            // 点[0,1] = 躯干参考线（手动），点[2,3] = 骶骨参考线（继承自Sacral）
            const currentTool = tools.find(t => t.id === selectedTool);
            if (currentTool) {
              // 构建继承点 Map（destinationIndex → Point）
              const inheritedMap = new Map<number, Point>();
              const rules = POINT_INHERITANCE_RULES['ts'] || [];
              for (const rule of rules) {
                const source = measurements.find(m => m.type === rule.fromType);
                if (source) {
                  for (let i = 0; i < rule.sourcePointIndices.length; i++) {
                    const srcIdx = rule.sourcePointIndices[i];
                    const dstIdx = rule.destinationPointIndices[i];
                    if (srcIdx < source.points.length) {
                      inheritedMap.set(dstIdx, source.points[srcIdx]);
                    }
                  }
                }
              }

              const effectiveNeeded = currentTool.pointsNeeded - inheritedMap.size;

              if (newPoints.length === 1) {
                // 第一个手动点：设置参考线预览
                setReferenceLines(prev => ({ ...prev, ts: imagePoint }));
              }

              if (newPoints.length === effectiveNeeded) {
                // 按索引位置组装完整4点（继承点填入[2,3]，手动点填入[0,1]）
                const allPoints: Point[] = [];
                let userPointIndex = 0;
                for (let i = 0; i < currentTool.pointsNeeded; i++) {
                  if (inheritedMap.has(i)) {
                    allPoints[i] = inheritedMap.get(i)!;
                  } else {
                    allPoints[i] = newPoints[userPointIndex++];
                  }
                }
                onMeasurementAdd(currentTool.name, allPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, ts: null }));
              }
            }
          } else if (selectedTool.includes('lld')) {
            // LLD 特殊处理 - 两条水平线的距离测量
            if (newPoints.length === 1) {
              // 第一个点：设置第一条水平线位置
              setReferenceLines(prev => ({ ...prev, lld: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, lld: null })); // 清除第一条水平线
              }
            }
          } else if (selectedTool.includes('c7-offset')) {
            // C7 Offset 特殊处理：前4个点手动标注，第5、6个点可从骶骨倾斜角继承
            const { points: inheritedPts, count: inheritedCount } =
              getInheritedPoints('c7-offset', measurements);
            const effectiveNeeded = 6 - inheritedCount; // 若有骶骨标注则为4，否则为6
            if (newPoints.length === effectiveNeeded) {
              const allPoints = [...newPoints, ...inheritedPts];
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, allPoints);
                setClickedPoints([]);
              }
            }
          } else {
            // 其他工具的通用逻辑（支持继承点位自动填充）
            const currentTool = tools.find(t => t.id === selectedTool);
            if (currentTool) {
              // 获取从已有标注中继承的点及其目标索引
              const asymRules = POINT_INHERITANCE_RULES[currentTool.id] || [];
              const inheritedMap = new Map<number, Point>(); // destinationIndex -> point

              // 处理非对称继承规则
              for (const rule of asymRules) {
                const source = measurements.find(m => m.type === rule.fromType);
                if (source) {
                  for (let i = 0; i < rule.sourcePointIndices.length; i++) {
                    const srcIdx = rule.sourcePointIndices[i];
                    const dstIdx = rule.destinationPointIndices[i];
                    if (srcIdx < source.points.length) {
                      inheritedMap.set(dstIdx, source.points[srcIdx]);
                    }
                  }
                }
              }

              // 处理对称共享解剖点
              for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
                const my = group.participants.find(
                  p => p.toolId === currentTool.id
                );
                if (!my || inheritedMap.has(my.pointIndex)) continue;

                for (const p of group.participants) {
                  if (p.toolId === currentTool.id) continue;
                  const source = measurements.find(m => m.type === p.typeName);
                  if (source && p.pointIndex < source.points.length) {
                    inheritedMap.set(
                      my.pointIndex,
                      source.points[p.pointIndex]
                    );
                    break;
                  }
                }
              }

              const effectiveNeeded =
                currentTool.pointsNeeded - inheritedMap.size;
              if (newPoints.length === effectiveNeeded) {
                // 构建完整的 allPoints 数组，按正确的索引位置填入点
                const allPoints: Point[] = [];
                let userPointIndex = 0;

                for (let i = 0; i < currentTool.pointsNeeded; i++) {
                  if (inheritedMap.has(i)) {
                    // 该位置有继承点
                    allPoints[i] = inheritedMap.get(i)!;
                  } else {
                    // 该位置用用户手动点击的点
                    allPoints[i] = newPoints[userPointIndex++];
                  }
                }

                onMeasurementAdd(currentTool.name, allPoints);
                setClickedPoints([]);
              }
            }
          }
        }

        // 设置为亮度调整模式（用于按住拖拽调整）
        setAdjustMode('brightness');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 🔒 安全检查：图像未加载完成时，禁止所有交互操作
    if (!imageNaturalSize) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLiveMouseImagePoint(screenToImage(x, y));

    // 处理标准距离点的拖拽
    if (draggingStandardPointIndex !== null && e.buttons === 1) {
      const imagePoint = screenToImage(x, y);
      const newPoints = [...standardDistancePoints];
      newPoints[draggingStandardPointIndex] = imagePoint;
      setStandardDistancePoints(newPoints);

      // 实时重新计算所有依赖标准距离的测量结果
      if (standardDistance !== null && newPoints.length === 2) {
        recalculateAVTandTS(standardDistance, newPoints);
      }
      return;
    }

    // 检测是否悬浮在标准距离点上（不限制工具类型）
    if (standardDistancePoints.length > 0) {
      const hoverRadius = INTERACTION_CONSTANTS.HOVER_RADIUS;
      let foundHover = false;

      for (let i = 0; i < standardDistancePoints.length; i++) {
        const point = standardDistancePoints[i];
        const pointScreen = imageToScreen(point);
        // 使用工具函数计算距离
        const distance = calculateDistance({ x, y }, pointScreen);

        if (distance < hoverRadius) {
          setHoveredStandardPointIndex(i);
          foundHover = true;
          break;
        }
      }

      if (!foundHover && hoveredStandardPointIndex !== null) {
        setHoveredStandardPointIndex(null);
      }
    }

    // 更新绘制状态中的当前点（用于预览）
    if (drawingState.isDrawing) {
      const imagePoint = screenToImage(x, y);
      setDrawingState(prev => ({
        ...prev,
        currentPoint: imagePoint,
      }));
    }

    // 处理选中对象的拖拽（优化：使用selectionState）
    if (
      (selectionState.measurementId || selectionState.pointIndex !== null) &&
      selectedTool === 'hand' &&
      e.buttons === 1
    ) {
      const imagePoint = screenToImage(x, y);

      // 如果还没开始拖拽,检查鼠标是否在边界框内
      if (!selectionState.isDragging) {
        let canDrag = false;

        if (selectionState.measurementId) {
          const measurement = measurements.find(
            m => m.id === selectionState.measurementId
          );
          if (measurement && measurement.points.length > 0) {
            // 使用与蓝色选中框相同的边界框计算逻辑
            let minX: number, maxX: number, minY: number, maxY: number;

            // 针对不同类型的图形计算不同的边界框（与选中框渲染逻辑一致）
            if (selectionState.type === 'whole') {
              // 辅助图形需要特殊处理
              if (
                measurement.type === '圆形标注' &&
                measurement.points.length >= 2
              ) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const radius = Math.sqrt(
                  Math.pow(edge.x - center.x, 2) +
                    Math.pow(edge.y - center.y, 2)
                );
                const screenCenter = imageToScreen(center);
                const screenRadius = radius * imageScale;

                minX = screenCenter.x - screenRadius - 15;
                maxX = screenCenter.x + screenRadius + 15;
                minY = screenCenter.y - screenRadius - 15;
                maxY = screenCenter.y + screenRadius + 15;
              } else if (
                measurement.type === '椭圆标注' &&
                measurement.points.length >= 2
              ) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const radiusX = Math.abs(edge.x - center.x);
                const radiusY = Math.abs(edge.y - center.y);
                const screenCenter = imageToScreen(center);
                const screenRadiusX = radiusX * imageScale;
                const screenRadiusY = radiusY * imageScale;

                minX = screenCenter.x - screenRadiusX - 15;
                maxX = screenCenter.x + screenRadiusX + 15;
                minY = screenCenter.y - screenRadiusY - 15;
                maxY = screenCenter.y + screenRadiusY + 15;
              } else if (
                measurement.type === '矩形标注' &&
                measurement.points.length >= 2
              ) {
                const start = measurement.points[0];
                const end = measurement.points[1];
                const startScreen = imageToScreen(start);
                const endScreen = imageToScreen(end);

                minX = Math.min(startScreen.x, endScreen.x) - 15;
                maxX = Math.max(startScreen.x, endScreen.x) + 15;
                minY = Math.min(startScreen.y, endScreen.y) - 15;
                maxY = Math.max(startScreen.y, endScreen.y) + 15;
              } else if (
                measurement.type === '箭头标注' &&
                measurement.points.length >= 2
              ) {
                const start = measurement.points[0];
                const end = measurement.points[1];
                const startScreen = imageToScreen(start);
                const endScreen = imageToScreen(end);

                minX = Math.min(startScreen.x, endScreen.x) - 15;
                maxX = Math.max(startScreen.x, endScreen.x) + 15;
                minY = Math.min(startScreen.y, endScreen.y) - 15;
                maxY = Math.max(startScreen.y, endScreen.y) + 15;
              } else {
                // 默认处理：基于标注点位置
                const screenPoints = measurement.points.map(p =>
                  imageToScreen(p)
                );
                const xs = screenPoints.map(p => p.x);
                const ys = screenPoints.map(p => p.y);
                minX = Math.min(...xs) - 15;
                maxX = Math.max(...xs) + 15;
                minY = Math.min(...ys) - 15;
                maxY = Math.max(...ys) + 15;
              }
            } else {
              // 点选择模式：基于标注点位置
              const screenPoints = measurement.points.map(p =>
                imageToScreen(p)
              );
              const xs = screenPoints.map(p => p.x);
              const ys = screenPoints.map(p => p.y);
              minX = Math.min(...xs) - 15;
              maxX = Math.max(...xs) + 15;
              minY = Math.min(...ys) - 15;
              maxY = Math.max(...ys) + 15;
            }

            // 将当前鼠标位置转换为屏幕坐标
            const mouseScreenPoint = imageToScreen(imagePoint);

            // 检查鼠标是否在边界框内
            if (
              mouseScreenPoint.x >= minX &&
              mouseScreenPoint.x <= maxX &&
              mouseScreenPoint.y >= minY &&
              mouseScreenPoint.y <= maxY
            ) {
              canDrag = true;
            }
          }
        } else if (
          selectionState.pointIndex !== null &&
          clickedPoints[selectionState.pointIndex]
        ) {
          // 对于单个点,始终允许拖拽
          canDrag = true;
        }

        if (canDrag) {
          setSelectionState({ ...selectionState, isDragging: true });
        }
        // 如果不能拖拽,不执行任何操作,让其他鼠标处理逻辑处理
      }

      // 如果已经在拖拽状态,继续拖拽(无论鼠标是否在边界框内)（优化：使用selectionState）
      if (
        selectionState.isDragging ||
        selectionState.measurementId ||
        selectionState.pointIndex !== null
      ) {
        if (selectionState.measurementId) {
          const measurement = measurements.find(
            m => m.id === selectionState.measurementId
          );
          if (measurement && measurement.points.length > 0) {
            if (
              selectionState.type === 'point' &&
              selectionState.pointIndex !== null
            ) {
              // 移动单个点
              let newPointX = imagePoint.x - selectionState.dragOffset.x;
              let newPointY = imagePoint.y - selectionState.dragOffset.y;

              // 辅助水平线：只允许水平拖动（锁定 Y 到另一点的 Y）
              if (measurement.type === '辅助水平线') {
                const otherIdx = selectionState.pointIndex === 0 ? 1 : 0;
                newPointY = measurement.points[otherIdx].y;
              }
              // 辅助垂直线：只允许垂直拖动（锁定 X 到另一点的 X）
              if (measurement.type === '辅助垂直线') {
                const otherIdx = selectionState.pointIndex === 0 ? 1 : 0;
                newPointX = measurement.points[otherIdx].x;
              }

              // 先应用点绑定传播（同步绑定组内其他点 & 更新中点导出绑定）
              const bindingPropagated = applyPointBindings(
                measurements,
                selectionState.measurementId!,
                selectionState.pointIndex,
                newPointX,
                newPointY,
                pointBindings
              );

              // 再对 moved 本身的点坐标做最终落位（applyPointBindings 不更新 moved 本体，外部已依赖 newPointX/Y）
              const updatedMeasurements = bindingPropagated.map(m => {
                if (m.id === selectionState.measurementId) {
                  const pts = m.points.map((p, idx) =>
                    idx === selectionState.pointIndex
                      ? { x: newPointX, y: newPointY }
                      : p
                  );
                  return {
                    ...m,
                    points: pts,
                    value:
                      calcMeasurementValue(m.type, pts, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                      }) || m.value,
                  };
                }
                // 重新计算所有被绑定更新的标注的测量值
                const originalMeasurement = measurements.find(
                  orig => orig.id === m.id
                );
                const pointsChanged = originalMeasurement
                  ? m.points.some((p, i) => {
                      const op = originalMeasurement.points[i];
                      return !op || p.x !== op.x || p.y !== op.y;
                    })
                  : false;
                if (pointsChanged) {
                  return {
                    ...m,
                    value:
                      calcMeasurementValue(m.type, m.points, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                      }) || m.value,
                  };
                }
                return m;
              });

              onMeasurementsUpdate(updatedMeasurements);
            } else {
              // 移动整个测量结果 - 使用中心点计算偏移
              const xs = measurement.points.map(p => p.x);
              const ys = measurement.points.map(p => p.y);
              const currentCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
              const currentCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;

              // 计算新的中心点位置
              const newCenterX = imagePoint.x - selectionState.dragOffset.x;
              const newCenterY = imagePoint.y - selectionState.dragOffset.y;

              // 计算偏移量
              const deltaX = newCenterX - currentCenterX;
              const deltaY = newCenterY - currentCenterY;

              // 先计算当前被拖拽标注的目标点位
              const movedPoints = measurement.points.map(p => ({
                x: p.x + deltaX,
                y: p.y + deltaY,
              }));

              // 逐点应用绑定传播：确保绑定组内所有关联点一起移动
              let bindingPropagated = measurements;
              for (
                let pointIdx = 0;
                pointIdx < movedPoints.length;
                pointIdx++
              ) {
                const movedPoint = movedPoints[pointIdx];
                bindingPropagated = applyPointBindings(
                  bindingPropagated,
                  selectionState.measurementId!,
                  pointIdx,
                  movedPoint.x,
                  movedPoint.y,
                  pointBindings
                );

                // applyPointBindings 不更新 moved 本体点，手动落位
                bindingPropagated = bindingPropagated.map(m => {
                  if (m.id !== selectionState.measurementId) return m;
                  const pts = m.points.map((p, idx) =>
                    idx === pointIdx ? movedPoint : p
                  );
                  return { ...m, points: pts };
                });
              }

              // 仅对实际变更的标注重算测量值
              const updatedMeasurements = bindingPropagated.map(m => {
                const originalMeasurement = measurements.find(
                  orig => orig.id === m.id
                );
                const pointsChanged = originalMeasurement
                  ? m.points.some((p, i) => {
                      const op = originalMeasurement.points[i];
                      return !op || p.x !== op.x || p.y !== op.y;
                    })
                  : false;

                if (pointsChanged) {
                  return {
                    ...m,
                    value:
                      calcMeasurementValue(m.type, m.points, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                      }) || m.value,
                  };
                }
                return m;
              });

              onMeasurementsUpdate(updatedMeasurements);
            }
          }
        } else if (selectionState.pointIndex !== null) {
          // 移动单个点
          const newPoints = [...clickedPoints];
          const newPoint = {
            x: imagePoint.x - selectionState.dragOffset.x,
            y: imagePoint.y - selectionState.dragOffset.y,
          };
          newPoints[selectionState.pointIndex] = newPoint;
          setClickedPoints(newPoints);

          // T1 Tilt 特殊处理：第一个点移动时，水平参考线跟随移动（优化：使用referenceLines）
          if (
            selectedTool.includes('t1-tilt') &&
            selectionState.pointIndex === 0 &&
            referenceLines.t1Tilt
          ) {
            setReferenceLines(prev => ({ ...prev, t1Tilt: newPoint }));
          }
        }
      }
    } else if (
      adjustMode === 'zoom' &&
      isDragging &&
      selectedTool === 'hand' &&
      !isImagePanLocked
    ) {
      // 只有在未锁定图像平移时才允许移动图像
      setImagePosition({
        x: x - dragStart.x,
        y: y - dragStart.y,
      });
    } else if (adjustMode === 'brightness' && e.buttons === 1) {
      // 左键按住时调整亮度和对比度
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      // 左右移动调整对比度
      const newContrast = Math.max(
        -100,
        Math.min(100, contrast + deltaX * 0.5)
      );
      setContrast(newContrast);

      // 上下移动调整亮度
      const newBrightness = Math.max(
        -100,
        Math.min(100, brightness - deltaY * 0.5)
      );
      setBrightness(newBrightness);

      // 更新起始位置，实现连续调整
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }

    // 在移动模式下，且没有正在拖拽时，检测悬浮高亮（即使有选中元素也允许悬浮预览）（优化：使用selectionState）
    if (
      selectedTool === 'hand' &&
      !selectionState.isDragging &&
      !isDragging &&
      !drawingState.isDrawing
    ) {
      // 计算点和线的hover阈值（屏幕像素距离）- 使用常量
      const screenPoint = { x, y };
      const pointHoverRadius = INTERACTION_CONSTANTS.HOVER_RADIUS;
      const lineHoverRadius = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS;

      let foundHover = false;
      let hoveredMeasurementId: string | null = null;
      let hoveredPointIdx: number | null = null;
      let hoveredElementType: 'point' | 'whole' | null = null;

      // 检查是否悬浮在已完成的测量结果上
      for (const measurement of measurements) {
        // 跳过被隐藏的标注（标注整体被隐藏时，不响应任何鼠标事件）
        if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id)) {
          continue;
        }

        const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);

        // 1. 检查是否悬浮在点上 - 优先级最高
        for (let i = 0; i < measurement.points.length; i++) {
          const point = measurement.points[i];
          const screenPointPos = imageToScreen(point);
          const distance = Math.sqrt(
            Math.pow(screenPoint.x - screenPointPos.x, 2) +
              Math.pow(screenPoint.y - screenPointPos.y, 2)
          );
          if (distance < pointHoverRadius) {
            hoveredMeasurementId = measurement.id;
            hoveredPointIdx = i;
            hoveredElementType = 'point';
            foundHover = true;
            break;
          }
        }

        // 2. 如果没有悬浮在点上，检查是否悬浮在文字标识或辅助图形内部
        if (!foundHover) {
          if (isAuxiliaryShape) {
            // 辅助图形：检查是否悬浮在图形边界线条上（使用屏幕坐标检测）

            if (
              measurement.type === '圆形标注' &&
              measurement.points.length === 2
            ) {
              const centerScreen = imageToScreen(measurement.points[0]);
              const edgeScreen = imageToScreen(measurement.points[1]);
              const screenRadius = Math.sqrt(
                Math.pow(edgeScreen.x - centerScreen.x, 2) +
                  Math.pow(edgeScreen.y - centerScreen.y, 2)
              );
              const distToCenter = Math.sqrt(
                Math.pow(screenPoint.x - centerScreen.x, 2) +
                  Math.pow(screenPoint.y - centerScreen.y, 2)
              );
              // 检查是否悬浮在圆边界附近
              if (Math.abs(distToCenter - screenRadius) < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (
              measurement.type === '椭圆标注' &&
              measurement.points.length === 2
            ) {
              const centerScreen = imageToScreen(measurement.points[0]);
              const edgeScreen = imageToScreen(measurement.points[1]);
              const radiusX = Math.abs(edgeScreen.x - centerScreen.x);
              const radiusY = Math.abs(edgeScreen.y - centerScreen.y);

              if (radiusX > 0 && radiusY > 0) {
                // 计算点到椭圆边界的距离（近似）
                const dx = screenPoint.x - centerScreen.x;
                const dy = screenPoint.y - centerScreen.y;
                const normalizedDist = Math.sqrt(
                  Math.pow(dx / radiusX, 2) + Math.pow(dy / radiusY, 2)
                );
                // 检查是否悬浮在椭圆边界附近
                if (
                  Math.abs(normalizedDist - 1) <
                  lineHoverRadius / Math.min(radiusX, radiusY)
                ) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                }
              }
            } else if (
              measurement.type === '矩形标注' &&
              measurement.points.length === 2
            ) {
              const p1Screen = imageToScreen(measurement.points[0]);
              const p2Screen = imageToScreen(measurement.points[1]);
              const minX = Math.min(p1Screen.x, p2Screen.x);
              const maxX = Math.max(p1Screen.x, p2Screen.x);
              const minY = Math.min(p1Screen.y, p2Screen.y);
              const maxY = Math.max(p1Screen.y, p2Screen.y);

              // 检查是否悬浮在四条边中的任意一条
              const distToLeft = Math.abs(screenPoint.x - minX);
              const distToRight = Math.abs(screenPoint.x - maxX);
              const distToTop = Math.abs(screenPoint.y - minY);
              const distToBottom = Math.abs(screenPoint.y - maxY);

              const onLeftOrRight =
                (distToLeft < lineHoverRadius ||
                  distToRight < lineHoverRadius) &&
                screenPoint.y >= minY - lineHoverRadius &&
                screenPoint.y <= maxY + lineHoverRadius;
              const onTopOrBottom =
                (distToTop < lineHoverRadius ||
                  distToBottom < lineHoverRadius) &&
                screenPoint.x >= minX - lineHoverRadius &&
                screenPoint.x <= maxX + lineHoverRadius;

              if (onLeftOrRight || onTopOrBottom) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (
              measurement.type === '多边形标注' &&
              measurement.points.length >= 3
            ) {
              // 多边形：检查是否悬浮在任意一条边上 - 使用工具函数
              for (let i = 0; i < measurement.points.length; i++) {
                const currentScreen = imageToScreen(measurement.points[i]);
                const nextScreen = imageToScreen(
                  measurement.points[(i + 1) % measurement.points.length]
                );

                // 使用工具函数计算点到线段的距离
                const distToEdge = pointToLineDistance(
                  screenPoint,
                  currentScreen,
                  nextScreen
                );

                if (distToEdge < lineHoverRadius) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                  break;
                }
              }
            } else if (
              measurement.type === '箭头标注' &&
              measurement.points.length >= 2
            ) {
              // 箭头：检查是否悬浮在箭头线段上 - 使用工具函数
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);

              // 使用工具函数计算点到线段的距离
              const distToLine = pointToLineDistance(
                screenPoint,
                startScreen,
                endScreen
              );

              if (distToLine < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (
              measurement.type === '锥体中心' &&
              measurement.points.length === 4
            ) {
              // 锥体中心：检查是否悬浮在四边形边缘或中心点
              // 检查四边形边缘
              for (let i = 0; i < measurement.points.length; i++) {
                const currentScreen = imageToScreen(measurement.points[i]);
                const nextScreen = imageToScreen(
                  measurement.points[(i + 1) % measurement.points.length]
                );

                const distToEdge = pointToLineDistance(
                  screenPoint,
                  currentScreen,
                  nextScreen
                );

                if (distToEdge < lineHoverRadius) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                  break;
                }
              }

              // 如果没有悬浮在边缘，检查中心点
              if (!foundHover) {
                const center = calculateQuadrilateralCenter(measurement.points);
                const centerScreen = imageToScreen(center);
                const distToCenter = calculateDistance(
                  screenPoint,
                  centerScreen
                );
                if (distToCenter < 15) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                }
              }
            } else if (
              measurement.type === '距离标注' &&
              measurement.points.length === 2
            ) {
              // 距离标注：检查是否悬浮在线段上
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);

              const distToLine = pointToLineDistance(
                screenPoint,
                startScreen,
                endScreen
              );

              if (distToLine < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (
              (measurement.type === '辅助水平线' ||
                measurement.type === '辅助垂直线') &&
              measurement.points.length === 2
            ) {
              // 辅助水平/垂直线段：检查是否悬浮在线段上
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);
              const distToLine = pointToLineDistance(
                screenPoint,
                startScreen,
                endScreen
              );

              if (distToLine < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (
              measurement.type === '角度标注' &&
              measurement.points.length === 3
            ) {
              // 角度标注：检查是否悬浮在两条线段上
              const p0Screen = imageToScreen(measurement.points[0]);
              const p1Screen = imageToScreen(measurement.points[1]);
              const p2Screen = imageToScreen(measurement.points[2]);

              const distToLine1 = pointToLineDistance(
                screenPoint,
                p0Screen,
                p1Screen
              );
              const distToLine2 = pointToLineDistance(
                screenPoint,
                p1Screen,
                p2Screen
              );

              if (
                distToLine1 < lineHoverRadius ||
                distToLine2 < lineHoverRadius
              ) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            }
          } else {
            // 非辅助图形：检查文字标识区域（使用屏幕坐标，与渲染位置保持一致）
            const screenPoints = measurement.points
              .map(p => imageToScreen(p))
              .filter(p => p !== null && p !== undefined);

            // 确保有足够的有效点
            if (screenPoints.length === 0) {
              continue;
            }

            // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标，然后转换为屏幕坐标
            const labelPosInImage = getLabelPositionForType(
              measurement.type,
              measurement.points,
              imageScale
            );
            const labelPosInScreen = imageToScreen(labelPosInImage);
            const textBaselineX = labelPosInScreen.x;
            const textBaselineY = labelPosInScreen.y;

            // 文字尺寸估算 - 使用工具函数
            const textContent = `${measurement.type}: ${measurement.value}`;
            const textWidth = estimateTextWidth(
              textContent,
              TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE
            );
            const textHeight = estimateTextHeight(
              TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE
            );

            // SVG text的y坐标是基线，文字实际在基线上方
            const textTop = textBaselineY - textHeight / 2;
            const textBottom = textBaselineY + textHeight / 2;

            if (
              screenPoint.x >= textBaselineX - textWidth / 2 &&
              screenPoint.x <= textBaselineX + textWidth / 2 &&
              screenPoint.y >= textTop &&
              screenPoint.y <= textBottom
            ) {
              hoveredMeasurementId = measurement.id;
              hoveredElementType = 'whole';
              foundHover = true;
            }
          }
        }

        if (foundHover) break;
      }

      // 检查是否悬浮在正在绘制的点上
      if (!foundHover && clickedPoints.length > 0) {
        for (let i = 0; i < clickedPoints.length; i++) {
          const point = clickedPoints[i];
          const pointScreen = imageToScreen(point);
          const distance = Math.sqrt(
            Math.pow(screenPoint.x - pointScreen.x, 2) +
              Math.pow(screenPoint.y - pointScreen.y, 2)
          );
          if (distance < pointHoverRadius) {
            hoveredPointIdx = i;
            hoveredElementType = 'point';
            foundHover = true;
            break;
          }
        }
      }

      // 更新悬浮状态（优化：一次性更新所有悬浮状态，减少重渲染）
      setHoverState({
        measurementId: hoveredMeasurementId,
        pointIndex: hoveredPointIdx,
        elementType: hoveredElementType,
      });
    } else {
      // 清除悬浮状态
      setHoverState({
        measurementId: null,
        pointIndex: null,
        elementType: null,
      });
    }
  };

  const completePolygon = () => {
    if (clickedPoints.length >= 3) {
      onMeasurementAdd('多边形标注', clickedPoints);
      setClickedPoints([]);
    }
  };

  const handleMouseUp = () => {
    // 清除标准距离点拖拽状态
    if (draggingStandardPointIndex !== null) {
      setDraggingStandardPointIndex(null);
    }

    // 结束拖拽选中对象（优化：使用selectionState）
    if (selectionState.isDragging) {
      setSelectionState({ ...selectionState, isDragging: false });
    }

    if (
      drawingState.isDrawing &&
      drawingState.startPoint &&
      drawingState.currentPoint
    ) {
      // 完成图形绘制
      const startX = drawingState.startPoint.x;
      const startY = drawingState.startPoint.y;
      const endX = drawingState.currentPoint.x;
      const endY = drawingState.currentPoint.y;

      if (selectedTool === 'circle') {
        // 圆形：存储中心点和边缘点（用于计算半径）
        const points: Point[] = [
          { x: startX, y: startY }, // 中心点
          { x: endX, y: endY }, // 边缘点
        ];
        onMeasurementAdd('圆形标注', points);
      } else if (selectedTool === 'ellipse') {
        // 椭圆：存储中心点和边界点
        const points: Point[] = [
          { x: startX, y: startY }, // 中心点
          { x: endX, y: endY }, // 边界点
        ];
        onMeasurementAdd('椭圆标注', points);
      } else if (selectedTool === 'rectangle') {
        // 矩形：存储左上角和右下角
        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const maxX = Math.max(startX, endX);
        const maxY = Math.max(startY, endY);
        const points: Point[] = [
          { x: minX, y: minY }, // 左上角
          { x: maxX, y: maxY }, // 右下角
        ];
        onMeasurementAdd('矩形标注', points);
      } else if (selectedTool === 'arrow') {
        // 箭头：存储起点和终点
        const points: Point[] = [
          { x: startX, y: startY }, // 起点
          { x: endX, y: endY }, // 终点
        ];
        onMeasurementAdd('箭头标注', points);
      }
      // 其他图形类型的处理将在后续任务中添加
    }
    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });

    // 清除标准距离点拖拽状态
    if (draggingStandardPointIndex !== null) {
      setDraggingStandardPointIndex(null);
    }

    setIsDragging(false);
    setAdjustMode('none');
  };

  const handleDoubleClick = () => {
    // 双击重置视图
    resetView();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止默认右键菜单
    e.stopPropagation(); // 阻止事件冒泡

    // 🔒 安全检查：图像未加载完成时，禁止所有交互操作
    if (!imageNaturalSize) {
      console.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
      return;
    }

    // 检查是否选中了辅助图形（优先级最高）
    if (selectionState.measurementId && selectionState.type === 'whole') {
      const selectedMeasurement = measurements.find(
        m => m.id === selectionState.measurementId
      );

      const auxiliaryShapeTypes = [
        '圆形标注',
        '椭圆标注',
        '矩形标注',
        '箭头标注',
      ];

      if (
        selectedMeasurement &&
        auxiliaryShapeTypes.includes(selectedMeasurement.type)
      ) {
        // 显示右键菜单
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          measurementId: selectedMeasurement.id,
        });
        return;
      }
    }

    // 辅助图形工具列表
    const auxiliaryTools = ['circle', 'ellipse', 'rectangle', 'arrow'];

    // 如果当前是辅助图形工具，切换回 hand 工具
    if (auxiliaryTools.includes(selectedTool)) {
      console.log('🖱️ 右键点击，从', selectedTool, '切换回 hand 工具');

      // 找到最后一个辅助图形（刚绘制的）
      const auxiliaryShapeTypes = [
        '圆形标注',
        '椭圆标注',
        '矩形标注',
        '箭头标注',
      ];
      const lastAuxiliaryShape = [...measurements]
        .reverse()
        .find(m => auxiliaryShapeTypes.includes(m.type));

      // 如果找到了刚绘制的图形，选中它（优化：使用selectionState）
      if (lastAuxiliaryShape) {
        setSelectionState({
          measurementId: lastAuxiliaryShape.id,
          pointIndex: null,
          type: 'whole',
          isDragging: false,
          dragOffset: { x: 0, y: 0 },
        });
      }

      // 切换工具
      onToolChange('hand');
    }
  };

  // 右键菜单：编辑文字
  const handleEditLabel = () => {
    const measurement = measurements.find(
      m => m.id === contextMenu.measurementId
    );
    if (measurement) {
      setEditLabelDialog({
        visible: true,
        measurementId: measurement.id,
        currentLabel: measurement.description || '',
      });
      setContextMenu({ visible: false, x: 0, y: 0, measurementId: null });
    }
  };

  // 右键菜单：删除图形
  const handleDeleteShape = () => {
    if (contextMenu.measurementId) {
      // 使用 onMeasurementsUpdate 过滤掉被删除的测量
      const remainingMeasurements = measurements.filter(
        m => m.id !== contextMenu.measurementId
      );
      onMeasurementsUpdate(remainingMeasurements);
      // 清理绑定中指向已删除标注的悬空引用
      const remainingIds = new Set(remainingMeasurements.map(m => m.id));
      setPointBindings(cleanupBindings(pointBindings, remainingIds));
      setSelectionState({
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      });
    }
    setContextMenu({ visible: false, x: 0, y: 0, measurementId: null });
  };

  // 文字编辑对话框：保存
  const handleSaveLabel = () => {
    if (editLabelDialog.measurementId) {
      // 使用 onMeasurementsUpdate 更新测量数据
      // 对于辅助图形，使用 description 字段存储用户自定义的文字标注
      onMeasurementsUpdate(
        measurements.map(m =>
          m.id === editLabelDialog.measurementId
            ? { ...m, description: editLabelDialog.currentLabel }
            : m
        )
      );
    }
    setEditLabelDialog({
      visible: false,
      measurementId: null,
      currentLabel: '',
    });
  };

  // 文字编辑对话框：取消
  const handleCancelEdit = () => {
    setEditLabelDialog({
      visible: false,
      measurementId: null,
      currentLabel: '',
    });
  };

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, measurementId: null });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isHovering) {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      // 使用函数式更新，避免闭包问题
      setImageScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
    }
  };

  // 使用useEffect添加非被动的wheel事件监听器和键盘快捷键
  useEffect(() => {
    const container = document.querySelector(
      '[data-image-canvas]'
    ) as HTMLElement;
    if (!container) return;

    const handleWheelEvent = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
      // 改进：使用更小的步长，便于精确调整
      const delta = wheelEvent.deltaY > 0 ? 0.95 : 1.05;
      // 使用函数式更新，避免依赖 imageScale
      setImageScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
    };

    // 键盘快捷键处理
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框内，如果是则不处理快捷键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // R 键：重置视图到 100%
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetView();
      }
      // 1 键：快速设置为 100%
      if (e.key === '1') {
        e.preventDefault();
        setImageScale(1);
      }
      // + 键：放大
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setImageScale(prev => Math.min(5, prev * 1.2));
      }
      // - 键：缩小
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setImageScale(prev => Math.max(0.1, prev * 0.8));
      }
    };

    container.addEventListener('wheel', handleWheelEvent as EventListener, {
      passive: false,
    });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // 安全地移除事件监听器
      if (container && container.removeEventListener) {
        container.removeEventListener(
          'wheel',
          handleWheelEvent as EventListener
        );
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const resetView = () => {
    console.log('🔄 resetView 被调用，将重置 imageScale 为 1');
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setClickedPoints([]);
    // 不改变当前选中的工具
  };

  const clearCurrentMeasurement = () => {
    setClickedPoints([]);
    // 清除参考线（优化：使用referenceLines）
    setReferenceLines(prev => ({
      ...prev,
      t1Tilt:
        selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')
          ? null
          : prev.t1Tilt,
      ss: selectedTool.includes('ss') ? null : prev.ss,
      sva: selectedTool.includes('sva') ? null : prev.sva,
      // aux-horizontal-line 和 aux-vertical-line 不再使用 referenceLines，已改为从 measurements 中渲染
    }));
  };

  const getCursorStyle = () => {
    if (isSettingStandardDistance) return 'cursor-crosshair';
    if (selectedTool === 'hand') return 'cursor-grab active:cursor-grabbing';
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      data-image-canvas
      className={`relative w-full h-full overflow-hidden ${getCursorStyle()} ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onDragStart={e => e.preventDefault()}
      onDrag={e => e.preventDefault()}
      onDragEnd={e => e.preventDefault()}
    >
      {/* 左上角测量结果展示区 */}
      <div
        className="absolute top-4 left-48 z-50"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onPointerMove={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden w-[240px]">
          <div className="flex items-center justify-between px-3 py-2 bg-black/20 w-full">
            <div className="flex items-center min-w-0">
              <button
                onClick={e => {
                  e.stopPropagation();
                  const newHideAll = !hideAllAnnotations;
                  setHideAllAnnotations(newHideAll);
                  // 同步所有个体标注按钮状态（包括标准距离）
                  if (newHideAll) {
                    const allIds = new Set(measurements.map(m => m.id));
                    setHiddenAnnotationIds(allIds);
                    setIsStandardDistanceHidden(true);
                  } else {
                    setHiddenAnnotationIds(new Set());
                    setIsStandardDistanceHidden(false);
                  }
                }}
                className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1"
                title={hideAllAnnotations ? '显示所有标注' : '隐藏所有标注'}
              >
                <i
                  className={`${hideAllAnnotations ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}
                ></i>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  const newHideAll = !hideAllLabels;
                  setHideAllLabels(newHideAll);
                  // 同步所有个体标识按钮状态
                  if (newHideAll) {
                    const allIds = new Set(measurements.map(m => m.id));
                    setHiddenMeasurementIds(allIds);
                  } else {
                    setHiddenMeasurementIds(new Set());
                  }
                }}
                className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 mr-2"
                title={hideAllLabels ? '显示所有标识' : '隐藏所有标识'}
              >
                <i
                  className={`${hideAllLabels ? 'ri-format-clear' : 'ri-text'} text-sm`}
                ></i>
              </button>
              <span className="text-white text-xs font-medium whitespace-nowrap">
                测量结果
              </span>
            </div>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-white/80 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2"
            >
              <i
                className={`${showResults ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}
              ></i>
            </button>
          </div>

          {showResults && (
            <div
              className="max-h-[50vh] overflow-y-auto"
              onWheel={e => e.stopPropagation()}
            >
              {(standardDistance !== null &&
                standardDistancePoints.length === 2) ||
              measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {/* 标准距离显示项 - 始终显示在最前面 */}
                  {standardDistance !== null &&
                    standardDistancePoints.length === 2 && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40">
                        {/* 标注显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const newHidden = !isStandardDistanceHidden;
                            setIsStandardDistanceHidden(newHidden);

                            // 同步全局标注隐藏状态
                            const allHidden =
                              newHidden &&
                              measurements.every(m =>
                                hiddenAnnotationIds.has(m.id)
                              );
                            setHideAllAnnotations(allHidden);
                          }}
                          className="text-purple-400/60 hover:text-purple-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={
                            isStandardDistanceHidden ? '显示标注' : '隐藏标注'
                          }
                        >
                          <i
                            className={`${isStandardDistanceHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        {/* 标识显示占位（保持对齐） */}
                        <div className="w-4 h-4 flex-shrink-0"></div>

                        {/* 中间内容区域 */}
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate mr-2 font-medium text-purple-300">
                            标准距离
                          </span>
                          <span className="font-mono whitespace-nowrap text-purple-200">
                            {standardDistance}mm
                          </span>
                        </div>

                        {/* 右侧占位（保持对齐） */}
                        <div className="w-4 h-4 flex-shrink-0"></div>
                      </div>
                    )}

                  {measurements.map(measurement => {
                    // 判断当前测量是否被选中或悬浮（优化：使用selectionState）
                    const isSelected =
                      selectionState.measurementId === measurement.id;
                    const isHovered =
                      !isSelected &&
                      hoverState.measurementId === measurement.id;
                    const isLabelHidden = hiddenMeasurementIds.has(
                      measurement.id
                    );
                    const isAnnotationHidden = hiddenAnnotationIds.has(
                      measurement.id
                    );

                    return (
                      <div
                        key={measurement.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                          isSelected
                            ? 'bg-white/20 border border-white/50'
                            : isHovered
                              ? 'bg-yellow-500/20 border border-yellow-500/40'
                              : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {/* 左侧标注显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenAnnotationIds);
                            if (isAnnotationHidden) {
                              newHidden.delete(measurement.id);
                            } else {
                              newHidden.add(measurement.id);
                            }
                            setHiddenAnnotationIds(newHidden);

                            // 同步全局标注隐藏状态
                            const allHidden = measurements.every(m =>
                              m.id === measurement.id
                                ? !isAnnotationHidden
                                : newHidden.has(m.id)
                            );
                            setHideAllAnnotations(allHidden);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isAnnotationHidden ? '显示标注' : '隐藏标注'}
                        >
                          <i
                            className={`${isAnnotationHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}
                          ></i>
                        </button>
                        {/* 标识显示按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenMeasurementIds);
                            if (isLabelHidden) {
                              newHidden.delete(measurement.id);
                            } else {
                              newHidden.add(measurement.id);
                            }
                            setHiddenMeasurementIds(newHidden);

                            // 同步全局标识隐藏状态
                            const allHidden = measurements.every(m =>
                              m.id === measurement.id
                                ? !isLabelHidden
                                : newHidden.has(m.id)
                            );
                            setHideAllLabels(allHidden);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isLabelHidden ? '显示标识' : '隐藏标识'}
                        >
                          <i
                            className={`${isLabelHidden ? 'ri-format-clear' : 'ri-text'} text-xs`}
                          ></i>
                        </button>

                        {/* 中间内容区域 */}
                        <div
                          className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
                          onMouseEnter={e => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: measurement.id,
                              elementType: 'whole',
                              pointIndex: null,
                            });
                          }}
                          onMouseLeave={e => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: null,
                              elementType: null,
                              pointIndex: null,
                            });
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            // 在左侧测量结果面板中点击标注时，优先级最高，自动切换为移动模式
                            setSelectedTool('hand');

                            if (
                              selectionState.measurementId === measurement.id
                            ) {
                              // 如果已选中，则取消选中（优化：使用selectionState）
                              setSelectionState({
                                measurementId: null,
                                pointIndex: null,
                                type: null,
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            } else {
                              // 选中该测量（优化：使用selectionState）
                              setSelectionState({
                                measurementId: measurement.id,
                                pointIndex: null,
                                type: 'whole',
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            }
                          }}
                          title={
                            // 方案C：悬浮时显示完整椎体信息
                            measurement.upperVertebra &&
                            measurement.lowerVertebra &&
                            measurement.apexVertebra
                              ? `上端椎: ${measurement.upperVertebra} | 下端椎: ${measurement.lowerVertebra} | 顶椎: ${measurement.apexVertebra}`
                              : undefined
                          }
                        >
                          <span
                            className={`truncate mr-2 font-medium ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? 'text-yellow-300'
                                  : 'text-white/90'
                            }`}
                          >
                            {/* 对于辅助图形，如果有自定义description则显示，否则显示type */}
                            {checkIsAuxiliaryShape(measurement.type) &&
                            measurement.description &&
                            measurement.description !==
                              getDesc(measurement.type)
                              ? measurement.description
                              : measurement.type}
                          </span>
                          <span
                            className={`font-mono whitespace-nowrap ${
                              isSelected
                                ? 'text-white'
                                : isHovered
                                  ? measurement.value.startsWith('-')
                                    ? 'text-blue-300'
                                    : 'text-yellow-200'
                                  : measurement.value.startsWith('-')
                                    ? 'text-blue-400'
                                    : 'text-yellow-400'
                            }`}
                          >
                            {/* 方案B：紧凑显示椎体范围 */}
                            {measurement.value}
                            {measurement.upperVertebra &&
                              measurement.lowerVertebra && (
                                <span className="text-white/60 text-xs ml-1">
                                  ({measurement.upperVertebra}-
                                  {measurement.lowerVertebra})
                                </span>
                              )}
                          </span>
                        </div>

                        {/* 右侧删除按钮 */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onMeasurementsUpdate(
                              measurements.filter(m => m.id !== measurement.id)
                            );
                            // 如果删除的是选中项，清除选中状态（优化：使用selectionState）
                            if (
                              selectionState.measurementId === measurement.id
                            ) {
                              setSelectionState({
                                measurementId: null,
                                pointIndex: null,
                                type: null,
                                isDragging: false,
                                dragOffset: { x: 0, y: 0 },
                              });
                            }
                            // 同时从隐藏列表中移除
                            const newHidden = new Set(hiddenMeasurementIds);
                            newHidden.delete(measurement.id);
                            setHiddenMeasurementIds(newHidden);
                          }}
                          className="text-red-400/60 hover:text-red-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title="删除标注"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <i className="ri-ruler-line w-4 h-4 flex items-center justify-center mx-auto mb-1 text-white/60"></i>
                  <p className="text-xs text-white/60">暂无测量数据</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右上角控制工具栏 */}
      <div
        className="absolute top-4 right-4 z-10 bg-black/80 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 flex flex-col gap-3 min-w-max"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onDoubleClick={e => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🚫 控制面板阻止了双击事件');
        }}
      >
        {/* 清空按钮 */}
        <div className="flex items-center justify-center">
          <button
            onClick={e => {
              e.stopPropagation();
              handleClear();
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-xs font-medium transition-all active:scale-95 w-full justify-center"
            title="清空所有标注"
          >
            <i className="ri-delete-bin-line"></i>
            <span>清空全部</span>
          </button>
        </div>

        {/* 缩放调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">缩放</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.max(0.1, prev * 0.8);
                return newScale;
              });
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="缩小 (快捷键: -)"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-8 text-center">
            {(() => {
              const percentage = Math.round(imageScale * 100);
              return percentage + '%';
            })()}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.min(5, prev * 1.2);
                return newScale;
              });
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="放大 (快捷键: +)"
          >
            +
          </button>
        </div>

        {/* 对比度调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">对比度</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setContrast(prev => Math.max(-100, prev - 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低对比度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(contrast)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setContrast(prev => Math.min(100, prev + 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="提高对比度"
          >
            +
          </button>
        </div>

        {/* 亮度调节 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-white text-xs whitespace-nowrap">亮度</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setBrightness(prev => Math.max(-100, prev - 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低亮度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(brightness)}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setBrightness(prev => Math.min(100, prev + 5));
            }}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="提高亮度"
          >
            +
          </button>
        </div>
      </div>

      {/* 主图像 */}
      <div className="relative flex items-center justify-center w-full h-full">
        {imageLoading ? (
          <div className="flex items-center justify-center text-white">
            <i className="ri-loader-line w-8 h-8 flex items-center justify-center animate-spin mb-3 text-2xl"></i>
            <p className="text-sm ml-2">加载图像中...</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={selectedImage.examType}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            draggable={false}
            onDragStart={e => e.preventDefault()}
            onLoad={e => {
              const img = e.target as HTMLImageElement;
              const size = {
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
              setImageNaturalSize(size);
              onImageSizeChange(size);
              console.log('图像加载完成，原始尺寸:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                displayWidth: img.width,
                displayHeight: img.height,
              });
            }}
            style={{
              filter: `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100})`,
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
              transformOrigin: 'center center',
            }}
          />
        ) : (
          <div className="flex items-center justify-center text-white">
            <p className="text-sm">图像加载失败</p>
          </div>
        )}
      </div>

      {/* SVG标注层 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 10,
        }}
      >
        {/* 定义箭头标记 */}
        <defs>
          {/* 正常状态箭头头 */}
          <marker
            id="arrowhead-normal"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
          </marker>

          {/* 悬浮状态箭头头 */}
          <marker
            id="arrowhead-hovered"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
          </marker>

          {/* 选中状态箭头头 */}
          <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
          </marker>
        </defs>
        {/* 绘制已完成的测量 - 分两次渲染：先渲染非悬浮的，再渲染悬浮的（确保悬浮的显示在最前面） */}
        {[false, true].map(renderHovered =>
          measurements
            .filter(measurement => {
              // 过滤掉被隐藏的标注
              if (
                hideAllAnnotations ||
                hiddenAnnotationIds.has(measurement.id)
              ) {
                return false;
              }
              const isMeasurementHovered =
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';
              return renderHovered
                ? isMeasurementHovered
                : !isMeasurementHovered;
            })
            .map(measurement => {
              // 判断是否为辅助图形(不需要标识)
              const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);

              // 使用配置中的颜色
              const color = getColorForType(measurement.type);

              // 将图像坐标转换为屏幕坐标
              const screenPoints = measurement.points.map(p =>
                imageToScreen(p)
              );
              // 检查整个测量是否为选中或悬浮状态（优化：使用selectionState）
              const isMeasurementSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.type === 'whole';
              const isMeasurementHovered =
                !isMeasurementSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';

              // 根据状态确定颜色
              const displayColor = isMeasurementSelected
                ? '#ef4444'
                : isMeasurementHovered
                  ? '#fbbf24'
                  : color;

              return (
                <g key={measurement.id}>
                  {/* 关键点 - 辅助图形不显示定位点，除了辅助水平线和垂直线需要显示点标记 */}
                  {(!isAuxiliaryShape ||
                    measurement.type === '辅助水平线' ||
                    measurement.type === '辅助垂直线') &&
                    screenPoints.map((point, pointIndex) => {
                      // 检查是否为选中状态（优化：使用selectionState）
                      const isSelected =
                        selectionState.measurementId === measurement.id &&
                        ((selectionState.type === 'point' &&
                          selectionState.pointIndex === pointIndex) ||
                          selectionState.type === 'whole');

                      // 检查是否为悬浮高亮状态（只有在非选中状态下才显示悬浮）
                      const isHovered =
                        !isSelected &&
                        hoverState.measurementId === measurement.id &&
                        ((hoverState.elementType === 'point' &&
                          hoverState.pointIndex === pointIndex) ||
                          hoverState.elementType === 'whole');

                      // 检查是否为绑定点（有绑定时显示彩色外环）
                      const bindingColor = getBindingIndicatorColor(
                        measurement.id,
                        pointIndex,
                        pointBindings
                      );
                      const isInSelectedGroup =
                        selectedBindingGroupId !== null &&
                        getSyncGroupsForPoint(
                          measurement.id,
                          pointIndex,
                          pointBindings
                        ).some(g => g.id === selectedBindingGroupId);
                      const isManualSelected =
                        isManualBindingMode &&
                        manualBindingSelectedPoints.some(
                          p =>
                            p.annotationId === measurement.id &&
                            p.pointIndex === pointIndex
                        );

                      return (
                        <g key={pointIndex}>
                          {/* 绑定指示环（最底层，在点本身之下渲染） */}
                          {bindingColor && !isSelected && !isHovered && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isInSelectedGroup ? '10' : '7'}
                              fill={isInSelectedGroup ? `#ef444433` : 'none'}
                              stroke={
                                isInSelectedGroup ? '#ef4444' : bindingColor
                              }
                              strokeWidth={isInSelectedGroup ? '2.5' : '2'}
                              opacity={isInSelectedGroup ? '1' : '0.85'}
                              strokeDasharray={
                                isInSelectedGroup ? undefined : '3,2'
                              }
                            />
                          )}
                          {/* 手动绑定选中指示环 */}
                          {isManualSelected && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="11"
                              fill="#22d3ee33"
                              stroke="#22d3ee"
                              strokeWidth="2.5"
                              opacity="1"
                            />
                          )}
                          {/* 手动绑定模式下所有可选点的淡色外环提示 */}
                          {isManualBindingMode && !isManualSelected && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="9"
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1"
                              opacity="0.35"
                              strokeDasharray="2,2"
                            />
                          )}
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isSelected ? '5' : isHovered ? '6' : '3'}
                            fill={
                              isSelected
                                ? '#ef4444'
                                : isHovered
                                  ? '#fbbf24'
                                  : displayColor
                            }
                            stroke={
                              isSelected
                                ? '#ef4444'
                                : isHovered
                                  ? '#fbbf24'
                                  : '#ffffff'
                            }
                            strokeWidth={
                              isSelected ? '2' : isHovered ? '3' : '1'
                            }
                            opacity={isSelected || isHovered ? '1' : '0.8'}
                          />
                          {/* 选中时的外层圆圈 */}
                          {isSelected && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="8"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              opacity="0.6"
                            />
                          )}
                          {/* 悬浮时的外层高亮圆圈 */}
                          {isHovered && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="9"
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="2"
                              opacity="0.6"
                            />
                          )}
                          {/* 点的序号标注 - 辅助图形不显示 */}
                          <text
                            x={point.x + 8}
                            y={point.y - 8}
                            fill={
                              isSelected
                                ? '#ef4444'
                                : isHovered
                                  ? '#fbbf24'
                                  : displayColor
                            }
                            fontSize={isSelected || isHovered ? '14' : '12'}
                            fontWeight="bold"
                            stroke="#000000"
                            strokeWidth="0.5"
                            paintOrder="stroke"
                          >
                            {/* AI检测的单点标注显示value，其他显示序号 */}
                            {measurement.type.startsWith('AI检测-') &&
                            screenPoints.length === 1
                              ? measurement.value
                              : pointIndex + 1}
                          </text>
                        </g>
                      );
                    })}
                  {/* 连接线 - 辅助图形不显示连接线，使用配置文件中的特殊渲染函数 */}
                  {/* 对于辅助水平线和垂直线，按线段处理 */}
                  {((!isAuxiliaryShape && screenPoints.length >= 2) ||
                    (isAuxiliaryShape &&
                      (measurement.type === '辅助水平线' ||
                        measurement.type === '辅助垂直线') &&
                      screenPoints.length >= 2)) &&
                    !(
                      (measurement.type === 'PI' ||
                        measurement.type === 'pi' ||
                        measurement.type === 'PT' ||
                        measurement.type === 'pt') &&
                      screenPoints.length < 3
                    ) && (
                      <>
                        {renderSpecialSVGElements(
                          measurement.type,
                          screenPoints,
                          displayColor,
                          imageScale
                        )}
                      </>
                    )}

                  {/* 测量值标注 - 显示在测量线中间 */}
                  {(!isAuxiliaryShape ||
                    measurement.type === '辅助水平线' ||
                    measurement.type === '辅助垂直线') &&
                    screenPoints.length >= 2 &&
                    !hideAllLabels &&
                    !hiddenMeasurementIds.has(measurement.id) &&
                    (() => {
                      const isSelected =
                        selectionState.measurementId === measurement.id &&
                        selectionState.type === 'whole';
                      const isHovered =
                        !isSelected &&
                        hoverState.measurementId === measurement.id &&
                        hoverState.elementType === 'whole';

                      // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标
                      const labelPosInImage = getLabelPositionForType(
                        measurement.type,
                        measurement.points,
                        imageScale
                      );
                      // 转换为屏幕坐标
                      const labelPosInScreen = imageToScreen(labelPosInImage);
                      const textX = labelPosInScreen.x;
                      const textY = labelPosInScreen.y;

                      const textContent = `${measurement.type}: ${measurement.value}`;
                      const fontSize = isHovered
                        ? TEXT_LABEL_CONSTANTS.HOVER_FONT_SIZE
                        : TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE;
                      const padding = TEXT_LABEL_CONSTANTS.PADDING;
                      // 估算文字宽度和高度 - 使用工具函数（不包含padding，因为需要单独使用）
                      const textWidth = estimateTextWidth(
                        textContent,
                        fontSize,
                        0
                      );
                      const textHeight = estimateTextHeight(fontSize, 0);

                      return (
                        <g>
                          {/* 白色背景 */}
                          <rect
                            x={textX - textWidth / 2 - padding}
                            y={textY - textHeight / 2 - padding}
                            width={textWidth + padding * 2}
                            height={textHeight + padding * 2}
                            fill="white"
                            opacity="0.9"
                            rx="3"
                          />
                          {/* 文字 */}
                          <text
                            x={textX}
                            y={textY + fontSize * 0.35}
                            fill={
                              isSelected
                                ? '#ef4444'
                                : isHovered
                                  ? '#fbbf24'
                                  : displayColor
                            }
                            fontSize={fontSize}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {measurement.type}: {measurement.value}
                          </text>
                        </g>
                      );
                    })()}
                </g>
              );
            })
        )}
        {/* 绘制当前点击的点 */}
        {clickedPoints.map((point, index) => {
          const screenPoint = imageToScreen(point);
          // 检查是否为悬浮高亮状态
          const isHovered =
            !hoverState.measurementId &&
            hoverState.elementType === 'point' &&
            hoverState.pointIndex === index;

          return (
            <g key={`current-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r={isHovered ? '6' : '4'}
                fill="#ef4444"
                stroke={isHovered ? '#fbbf24' : '#ffffff'}
                strokeWidth={isHovered ? '3' : '2'}
              />
              {/* 悬浮时的外层高亮圆圈 */}
              {isHovered && (
                <circle
                  cx={screenPoint.x}
                  cy={screenPoint.y}
                  r="9"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.6"
                />
              )}
              {/* 点序号背景 */}
              <rect
                x={screenPoint.x + 4}
                y={screenPoint.y - (isHovered ? 16 : 14)}
                width={(isHovered ? 14 : 12) * 0.7}
                height={(isHovered ? 14 : 12) * 1.0}
                fill="white"
                opacity="0.9"
                rx="2"
              />
              <text
                x={screenPoint.x + (isHovered ? 8.5 : 7.5)}
                y={screenPoint.y - (isHovered ? 4 : 4)}
                fill={isHovered ? '#fbbf24' : '#ef4444'}
                fontSize={isHovered ? '14' : '12'}
                fontWeight="bold"
              >
                {index + 1}
              </text>
            </g>
          );
        })}
        {/* 绘制标准距离设置的点 */}
        {!isStandardDistanceHidden &&
          standardDistancePoints.map((point, index) => {
            const screenPoint = imageToScreen(point);
            const isHovered = hoveredStandardPointIndex === index;
            const isDragging = draggingStandardPointIndex === index;
            return (
              <g key={`standard-distance-${index}`}>
                <circle
                  cx={screenPoint.x}
                  cy={screenPoint.y}
                  r={isHovered || isDragging ? '6' : '4'}
                  fill={isHovered || isDragging ? '#fbbf24' : '#9333ea'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                />
                {/* 点序号背景 */}
                <rect
                  x={screenPoint.x + (isHovered || isDragging ? 7 : 5)}
                  y={screenPoint.y - (isHovered || isDragging ? 16 : 14)}
                  width={isHovered || isDragging ? '12' : '10'}
                  height={isHovered || isDragging ? '14' : '12'}
                  fill="white"
                  opacity="0.9"
                  rx="2"
                />
                <text
                  x={screenPoint.x + (isHovered || isDragging ? 13 : 10)}
                  y={screenPoint.y - (isHovered || isDragging ? 4 : 4)}
                  fill={isHovered || isDragging ? '#fbbf24' : '#9333ea'}
                  fontSize={isHovered || isDragging ? '14' : '12'}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}{' '}
        {/* 绘制标准距离设置的尺子样式 */}
        {!isStandardDistanceHidden &&
          standardDistancePoints.length === 2 &&
          (() => {
            const p1 = imageToScreen(standardDistancePoints[0]);
            const p2 = imageToScreen(standardDistancePoints[1]);

            // 计算线段的角度
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            // 刻度线的垂直偏移
            const tickLength = 10;
            const perpAngle = ((angle + 90) * Math.PI) / 180;

            return (
              <g>
                {/* 主线段 */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#9333ea"
                  strokeWidth="2"
                />

                {/* 起点刻度线 */}
                <line
                  x1={p1.x - Math.cos(perpAngle) * tickLength}
                  y1={p1.y - Math.sin(perpAngle) * tickLength}
                  x2={p1.x + Math.cos(perpAngle) * tickLength}
                  y2={p1.y + Math.sin(perpAngle) * tickLength}
                  stroke="#9333ea"
                  strokeWidth="2"
                />

                {/* 终点刻度线 */}
                <line
                  x1={p2.x - Math.cos(perpAngle) * tickLength}
                  y1={p2.y - Math.sin(perpAngle) * tickLength}
                  x2={p2.x + Math.cos(perpAngle) * tickLength}
                  y2={p2.y + Math.sin(perpAngle) * tickLength}
                  stroke="#9333ea"
                  strokeWidth="2"
                />
              </g>
            );
          })()}
        {/* 绘制当前点击点之间的连线预览 */}
        {selectedTool !== 'hand' &&
          (() => {
            const isPelvicIncidenceTool =
              selectedTool.includes('pi') || selectedTool.includes('pt');
            const currentToolId = currentTool?.id || selectedTool;
            const {
              points: inheritedPreviewPoints,
              count: inheritedPreviewCount,
            } = isPelvicIncidenceTool
              ? getInheritedPoints(currentToolId, measurements)
              : { points: [], count: 0 };

            if (!isPelvicIncidenceTool && clickedPoints.length < 2) {
              return null;
            }

            if (
              isPelvicIncidenceTool &&
              clickedPoints.length + inheritedPreviewCount < 2
            ) {
              return null;
            }

            let previewPoints = clickedPoints;
            if (isPelvicIncidenceTool) {
              const inheritedMap = new Map<number, Point>();

              const asymRules = POINT_INHERITANCE_RULES[currentToolId] || [];
              for (const rule of asymRules) {
                const source = measurements.find(m => m.type === rule.fromType);
                if (!source) continue;

                for (let i = 0; i < rule.sourcePointIndices.length; i++) {
                  const srcIdx = rule.sourcePointIndices[i];
                  const dstIdx = rule.destinationPointIndices[i];
                  if (srcIdx < source.points.length) {
                    inheritedMap.set(dstIdx, source.points[srcIdx]);
                  }
                }
              }

              for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
                const my = group.participants.find(
                  p => p.toolId === currentToolId
                );
                if (!my || inheritedMap.has(my.pointIndex)) continue;

                for (const participant of group.participants) {
                  if (participant.toolId === currentToolId) continue;
                  const source = measurements.find(
                    m => m.type === participant.typeName
                  );
                  if (source && participant.pointIndex < source.points.length) {
                    inheritedMap.set(
                      my.pointIndex,
                      source.points[participant.pointIndex]
                    );
                    break;
                  }
                }
              }

              const sacralLeft = inheritedMap.get(1);
              const sacralRight = inheritedMap.get(2);

              if (sacralLeft && sacralRight) {
                previewPoints =
                  clickedPoints.length > 0
                    ? [clickedPoints[0], sacralLeft, sacralRight]
                    : [sacralLeft, sacralRight];
              }
            }

            const screenPoints = previewPoints.map(p => imageToScreen(p));

            return (
              <>
                {selectedTool.includes('ts') && screenPoints.length >= 2 ? (
                  // TTS 特殊预览：躯干水平线
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : currentTool?.pointsNeeded === 4 && screenPoints.length >= 2 ? (
                  screenPoints.length >= 2 &&
                  screenPoints.length < 4 && (
                    <line
                      x1={screenPoints[0].x}
                      y1={screenPoints[0].y}
                      x2={screenPoints[1].x}
                      y2={screenPoints[1].y}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="2,6"
                    />
                  )
                ) : currentTool?.pointsNeeded === 3 &&
                  screenPoints.length >= 2 &&
                  !selectedTool.includes('pi') &&
                  !selectedTool.includes('pt') ? (
                  screenPoints
                    .slice(0, -1)
                    .map((point, index) => (
                      <line
                        key={`preview-line-${index}`}
                        x1={point.x}
                        y1={point.y}
                        x2={screenPoints[index + 1].x}
                        y2={screenPoints[index + 1].y}
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="2,2"
                      />
                    ))
                ) : selectedTool.includes('t1-tilt') &&
                  screenPoints.length === 2 ? (
                  // T1 Tilt 特殊预览：椎体线
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : selectedTool.includes('t1-slope') &&
                  screenPoints.length === 2 ? (
                  // T1 Slope 特殊预览：椎体线（侧位）
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : selectedTool.includes('ca') && screenPoints.length === 2 ? (
                  // CA 特殊预览：两肩连线
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : selectedTool.includes('pelvic') &&
                  screenPoints.length === 2 ? (
                  // Pelvic 特殊预览：骨盆连线
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : selectedTool.includes('sacral') &&
                  screenPoints.length === 2 ? (
                  // Sacral 特殊预览：骶骨连线
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                ) : isPelvicIncidenceTool ? (
                  renderSpecialSVGElements(
                    currentTool?.name || selectedTool,
                    screenPoints,
                    '#ef4444',
                    imageScale
                  )
                ) : selectedTool.includes('c7-offset') ? (
                  // C7 Offset 特殊处理：标注过程中不显示连线
                  <></>
                ) : (
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[screenPoints.length - 1].x}
                    y2={screenPoints[screenPoints.length - 1].y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                )}
              </>
            );
          })()}
        {/* T1 Tilt 专用水平参考线 HRL（优化：使用referenceLines） */}
        {(selectedTool.includes('t1-tilt') ||
          selectedTool.includes('t1-slope')) &&
          referenceLines.t1Tilt && (
            <>
              {(() => {
                const referencePoint = imageToScreen(referenceLines.t1Tilt);
                const lineLength = 200 * imageScale; // 水平线长度随缩放变化
                return (
                  <g>
                    {/* 水平参考线 */}
                    <line
                      x1={referencePoint.x - lineLength / 2}
                      y1={referencePoint.y}
                      x2={referencePoint.x + lineLength / 2}
                      y2={referencePoint.y}
                      stroke="#00ff00"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                      opacity="0.8"
                    />
                    {/* 水平线标识背景 */}
                    <rect
                      x={referencePoint.x + lineLength / 2 + 7}
                      y={referencePoint.y - 6}
                      width="28"
                      height="16"
                      fill="white"
                      opacity="0.9"
                      rx="2"
                    />
                    {/* 水平线标识 */}
                    <text
                      x={referencePoint.x + lineLength / 2 + 21}
                      y={referencePoint.y + 4.2}
                      fill="#00ff00"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      HRL
                    </text>
                  </g>
                );
              })()}
            </>
          )}
        {/* CA 专用水平参考线 HRL（优化：使用referenceLines） */}
        {selectedTool.includes('ca') && referenceLines.ca && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.ca);
              const lineLength = 200 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平参考线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength / 2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength / 2 + 21}
                    y={referencePoint.y + 4.2}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HRL
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* Pelvic 专用水平参考线 HRL（优化：使用referenceLines） */}
        {selectedTool.includes('pelvic') && referenceLines.pelvic && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.pelvic);
              const lineLength = 200 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平参考线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength / 2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength / 2 + 21}
                    y={referencePoint.y + 4.2}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HRL
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* SS（骶骨倾斜角）专用水平参考线 HRL - 侧位（优化：使用referenceLines） */}
        {selectedTool.includes('ss') && referenceLines.ss && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.ss);
              const lineLength = 200 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平参考线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength / 2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength / 2 + 21}
                    y={referencePoint.y + 4.2}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HRL
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* Sacral 专用水平参考线 HRL（优化：使用referenceLines） */}
        {selectedTool.includes('sacral') && referenceLines.sacral && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.sacral);
              const lineLength = 200 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平参考线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength / 2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength / 2 + 21}
                    y={referencePoint.y + 4.2}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HRL
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* AVT 专用第一条垂直辅助线（优化：使用referenceLines） */}
        {selectedTool.includes('avt') && referenceLines.avt && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.avt);
              const lineLength = 100 * imageScale; // 垂直线长度随缩放变化
              return (
                <g>
                  {/* 垂直辅助线 */}
                  <line
                    x1={referencePoint.x}
                    y1={referencePoint.y - lineLength / 2}
                    x2={referencePoint.x}
                    y2={referencePoint.y + lineLength / 2}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 垂直线标识背景 */}
                  <rect
                    x={referencePoint.x + 7}
                    y={referencePoint.y - lineLength / 2 - 16}
                    width="26"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 垂直线标识 */}
                  <text
                    x={referencePoint.x + 20}
                    y={referencePoint.y - lineLength / 2 - 3.8}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    VL1
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* TTS 专用第一条水平辅助线（优化：使用referenceLines） */}
        {selectedTool.includes('ts') && referenceLines.ts && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.ts);
              const lineLength = 150 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平辅助线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x - lineLength / 2 - 5}
                    y={referencePoint.y - 20}
                    width="30"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x - lineLength / 2 + 10}
                    y={referencePoint.y - 7}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HL1
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* LLD 专用第一条水平辅助线 */}
        {selectedTool.includes('lld') && referenceLines.lld && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.lld);
              const lineLength = 100 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平辅助线 */}
                  <line
                    x1={referencePoint.x - lineLength / 2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength / 2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength / 2 - 33}
                    y={referencePoint.y - 22}
                    width="26"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength / 2 - 20}
                    y={referencePoint.y - 9.8}
                    fill="#00ff00"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    HL1
                  </text>
                </g>
              );
            })()}
          </>
        )}
        {/* 绘制辅助圆形 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '圆形标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const center = measurement.points[0]; // 中心点
              const edge = measurement.points[1]; // 边缘点
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const radius = Math.sqrt(
                Math.pow(screenEdge.x - screenCenter.x, 2) +
                  Math.pow(screenEdge.y - screenCenter.y, 2)
              );
              const isSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.type === 'whole';
              const isHovered =
                !isSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';

              // 获取点的选中/悬浮状态
              const centerSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 0;
              const centerHovered =
                !centerSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 0;
              const edgeSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 1;
              const edgeHovered =
                !edgeSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 1;

              return (
                <g key={measurement.id}>
                  {/* 圆形 */}
                  <circle
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    r={radius}
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : 'none'
                    }
                    fillOpacity={isSelected ? '0.1' : isHovered ? '0.1' : '0'}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#3b82f6'
                    }
                    strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                    opacity={isSelected || isHovered ? '1' : '0.6'}
                  />

                  {/* 圆心点 */}
                  <g>
                    <circle
                      cx={screenCenter.x}
                      cy={screenCenter.y}
                      r={centerSelected ? '5' : centerHovered ? '6' : '3'}
                      fill={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#10b981'
                      }
                      stroke={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={
                        centerSelected ? '2' : centerHovered ? '3' : '1'
                      }
                      opacity={centerSelected || centerHovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {centerSelected && (
                      <circle
                        cx={screenCenter.x}
                        cy={screenCenter.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {centerHovered && (
                      <circle
                        cx={screenCenter.x}
                        cy={screenCenter.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 圆心点序号标注 */}
                    <text
                      x={screenCenter.x + 8}
                      y={screenCenter.y - 8}
                      fill={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#10b981'
                      }
                      fontSize={centerSelected || centerHovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      1
                    </text>
                  </g>

                  {/* 边缘点 */}
                  <g>
                    <circle
                      cx={screenEdge.x}
                      cy={screenEdge.y}
                      r={edgeSelected ? '5' : edgeHovered ? '6' : '3'}
                      fill={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#10b981'
                      }
                      stroke={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={edgeSelected ? '2' : edgeHovered ? '3' : '1'}
                      opacity={edgeSelected || edgeHovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {edgeSelected && (
                      <circle
                        cx={screenEdge.x}
                        cy={screenEdge.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {edgeHovered && (
                      <circle
                        cx={screenEdge.x}
                        cy={screenEdge.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 边缘点序号标注 */}
                    <text
                      x={screenEdge.x + 8}
                      y={screenEdge.y - 8}
                      fill={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#10b981'
                      }
                      fontSize={edgeSelected || edgeHovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      2
                    </text>
                  </g>

                  {/* 文字标注 - 显示在圆心下方，使用配置中的位置计算 */}
                  {measurement.description &&
                    (() => {
                      const labelPosInImage = getLabelPositionForType(
                        measurement.type,
                        measurement.points,
                        imageScale
                      );
                      const labelPosInScreen = imageToScreen(labelPosInImage);
                      return (
                        <text
                          x={labelPosInScreen.x}
                          y={labelPosInScreen.y + 5}
                          fill="#1e40af"
                          fontSize="14"
                          fontWeight="bold"
                          textAnchor="middle"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {measurement.description}
                        </text>
                      );
                    })()}
                </g>
              );
            }
            return null;
          })}
        {/* 绘制圆形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'circle' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            const radius = Math.sqrt(
              Math.pow(endScreen.x - startScreen.x, 2) +
                Math.pow(endScreen.y - startScreen.y, 2)
            );
            return (
              <circle
                key="circle-preview"
                cx={startScreen.x}
                cy={startScreen.y}
                r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制辅助椭圆 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '椭圆标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const center = measurement.points[0]; // 中心点
              const edge = measurement.points[1]; // 边界点
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const radiusX = Math.abs(screenEdge.x - screenCenter.x);
              const radiusY = Math.abs(screenEdge.y - screenCenter.y);
              const isSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.type === 'whole';
              const isHovered =
                !isSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';

              // 获取点的选中/悬浮状态
              const centerSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 0;
              const centerHovered =
                !centerSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 0;
              const edgeSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 1;
              const edgeHovered =
                !edgeSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 1;

              return (
                <g key={measurement.id}>
                  {/* 椭圆 */}
                  <ellipse
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    rx={radiusX}
                    ry={radiusY}
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : 'none'
                    }
                    fillOpacity={isSelected ? '0.1' : isHovered ? '0.1' : '0'}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#8b5cf6'
                    }
                    strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                    opacity={isSelected || isHovered ? '1' : '0.6'}
                  />

                  {/* 椭圆中心点 */}
                  <g>
                    <circle
                      cx={screenCenter.x}
                      cy={screenCenter.y}
                      r={centerSelected ? '5' : centerHovered ? '6' : '3'}
                      fill={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#14b8a6'
                      }
                      stroke={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={
                        centerSelected ? '2' : centerHovered ? '3' : '1'
                      }
                      opacity={centerSelected || centerHovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {centerSelected && (
                      <circle
                        cx={screenCenter.x}
                        cy={screenCenter.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {centerHovered && (
                      <circle
                        cx={screenCenter.x}
                        cy={screenCenter.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 椭圆中心点序号标注 */}
                    <text
                      x={screenCenter.x + 8}
                      y={screenCenter.y - 8}
                      fill={
                        centerSelected
                          ? '#ef4444'
                          : centerHovered
                            ? '#fbbf24'
                            : '#14b8a6'
                      }
                      fontSize={centerSelected || centerHovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      1
                    </text>
                  </g>

                  {/* 椭圆边界点 */}
                  <g>
                    <circle
                      cx={screenEdge.x}
                      cy={screenEdge.y}
                      r={edgeSelected ? '5' : edgeHovered ? '6' : '3'}
                      fill={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#14b8a6'
                      }
                      stroke={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={edgeSelected ? '2' : edgeHovered ? '3' : '1'}
                      opacity={edgeSelected || edgeHovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {edgeSelected && (
                      <circle
                        cx={screenEdge.x}
                        cy={screenEdge.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {edgeHovered && (
                      <circle
                        cx={screenEdge.x}
                        cy={screenEdge.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 椭圆边界点序号标注 */}
                    <text
                      x={screenEdge.x + 8}
                      y={screenEdge.y - 8}
                      fill={
                        edgeSelected
                          ? '#ef4444'
                          : edgeHovered
                            ? '#fbbf24'
                            : '#14b8a6'
                      }
                      fontSize={edgeSelected || edgeHovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      2
                    </text>
                  </g>

                  {/* 文字标注 - 显示在椭圆中心下方，使用配置中的位置计算 */}
                  {measurement.description &&
                    (() => {
                      const labelPosInImage = getLabelPositionForType(
                        measurement.type,
                        measurement.points,
                        imageScale
                      );
                      const labelPosInScreen = imageToScreen(labelPosInImage);
                      return (
                        <text
                          x={labelPosInScreen.x}
                          y={labelPosInScreen.y + 5}
                          fill="#6d28d9"
                          fontSize="14"
                          fontWeight="bold"
                          textAnchor="middle"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {measurement.description}
                        </text>
                      );
                    })()}
                </g>
              );
            }
            return null;
          })}
        {/* 绘制椭圆预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'ellipse' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            return (
              <ellipse
                key="ellipse-preview"
                cx={startScreen.x}
                cy={startScreen.y}
                rx={Math.abs(endScreen.x - startScreen.x)}
                ry={Math.abs(endScreen.y - startScreen.y)}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制辅助矩形 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '矩形标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const p0 = measurement.points[0]; // 点0：左上角
              const p1 = measurement.points[1]; // 点1：右下角

              // 计算矩形的四个角（图像坐标）
              const minX = Math.min(p0.x, p1.x);
              const maxX = Math.max(p0.x, p1.x);
              const minY = Math.min(p0.y, p1.y);
              const maxY = Math.max(p0.y, p1.y);

              // 转换为屏幕坐标
              const p0Screen = imageToScreen(p0);
              const p1Screen = imageToScreen(p1);

              const isSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.type === 'whole';
              const isHovered =
                !isSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';

              // 获取两个点的选中/悬浮状态
              const p0Selected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 0;
              const p0Hovered =
                !p0Selected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 0;
              const p1Selected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 1;
              const p1Hovered =
                !p1Selected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 1;

              const minXScreen = Math.min(p0Screen.x, p1Screen.x);
              const maxXScreen = Math.max(p0Screen.x, p1Screen.x);
              const minYScreen = Math.min(p0Screen.y, p1Screen.y);
              const maxYScreen = Math.max(p0Screen.y, p1Screen.y);
              const rectWidth = maxXScreen - minXScreen;
              const rectHeight = maxYScreen - minYScreen;

              return (
                <g key={measurement.id}>
                  {/* 矩形 */}
                  <rect
                    x={minXScreen}
                    y={minYScreen}
                    width={rectWidth}
                    height={rectHeight}
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : 'none'
                    }
                    fillOpacity={isSelected ? '0.1' : isHovered ? '0.1' : '0'}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#ec4899'
                    }
                    strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                    opacity={isSelected || isHovered ? '1' : '0.6'}
                  />

                  {/* 点0 - 通常是左上角 */}
                  <g>
                    <circle
                      cx={p0Screen.x}
                      cy={p0Screen.y}
                      r={p0Selected ? '5' : p0Hovered ? '6' : '3'}
                      fill={
                        p0Selected
                          ? '#ef4444'
                          : p0Hovered
                            ? '#fbbf24'
                            : '#06b6d4'
                      }
                      stroke={
                        p0Selected
                          ? '#ef4444'
                          : p0Hovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={p0Selected ? '2' : p0Hovered ? '3' : '1'}
                      opacity={p0Selected || p0Hovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {p0Selected && (
                      <circle
                        cx={p0Screen.x}
                        cy={p0Screen.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {p0Hovered && (
                      <circle
                        cx={p0Screen.x}
                        cy={p0Screen.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 点0的序号标注 */}
                    <text
                      x={p0Screen.x + 8}
                      y={p0Screen.y - 8}
                      fill={
                        p0Selected
                          ? '#ef4444'
                          : p0Hovered
                            ? '#fbbf24'
                            : '#06b6d4'
                      }
                      fontSize={p0Selected || p0Hovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      1
                    </text>
                  </g>

                  {/* 点1 - 通常是右下角 */}
                  <g>
                    <circle
                      cx={p1Screen.x}
                      cy={p1Screen.y}
                      r={p1Selected ? '5' : p1Hovered ? '6' : '3'}
                      fill={
                        p1Selected
                          ? '#ef4444'
                          : p1Hovered
                            ? '#fbbf24'
                            : '#06b6d4'
                      }
                      stroke={
                        p1Selected
                          ? '#ef4444'
                          : p1Hovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={p1Selected ? '2' : p1Hovered ? '3' : '1'}
                      opacity={p1Selected || p1Hovered ? '1' : '0.8'}
                    />
                    {/* 选中时的外层圆圈 */}
                    {p1Selected && (
                      <circle
                        cx={p1Screen.x}
                        cy={p1Screen.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {p1Hovered && (
                      <circle
                        cx={p1Screen.x}
                        cy={p1Screen.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 点1的序号标注 */}
                    <text
                      x={p1Screen.x + 8}
                      y={p1Screen.y - 8}
                      fill={
                        p1Selected
                          ? '#ef4444'
                          : p1Hovered
                            ? '#fbbf24'
                            : '#06b6d4'
                      }
                      fontSize={p1Selected || p1Hovered ? '14' : '12'}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      2
                    </text>
                  </g>

                  {/* 文字标注 - 显示在矩形上方，使用配置中的位置计算 */}
                  {measurement.description &&
                    (() => {
                      const labelPosInImage = getLabelPositionForType(
                        measurement.type,
                        measurement.points,
                        imageScale
                      );
                      const labelPosInScreen = imageToScreen(labelPosInImage);
                      return (
                        <text
                          x={labelPosInScreen.x}
                          y={labelPosInScreen.y + 5}
                          fill="#be185d"
                          fontSize="14"
                          fontWeight="bold"
                          textAnchor="middle"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {measurement.description}
                        </text>
                      );
                    })()}
                </g>
              );
            }
            return null;
          })}
        {/* 绘制矩形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'rectangle' &&
          (() => {
            const startScreen = imageToScreen(drawingState.startPoint);
            const endScreen = imageToScreen(drawingState.currentPoint);
            return (
              <rect
                key="rectangle-preview"
                x={Math.min(startScreen.x, endScreen.x)}
                y={Math.min(startScreen.y, endScreen.y)}
                width={Math.abs(endScreen.x - startScreen.x)}
                height={Math.abs(endScreen.y - startScreen.y)}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制箭头 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '箭头标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const start = imageToScreen(measurement.points[0]);
              const end = imageToScreen(measurement.points[1]);
              const isSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.type === 'whole';
              const isHovered =
                !isSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'whole';

              // 起点和终点的选中/悬浮状态
              const startPointSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 0;
              const endPointSelected =
                selectionState.measurementId === measurement.id &&
                selectionState.pointIndex === 1;
              const startPointHovered =
                !startPointSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 0;
              const endPointHovered =
                !endPointSelected &&
                hoverState.measurementId === measurement.id &&
                hoverState.elementType === 'point' &&
                hoverState.pointIndex === 1;

              // 确定箭头头部的marker
              let markerEnd = 'url(#arrowhead-normal)';
              if (isSelected) {
                markerEnd = 'url(#arrowhead-selected)';
              } else if (isHovered) {
                markerEnd = 'url(#arrowhead-hovered)';
              }

              return (
                <g key={measurement.id}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#f59e0b'
                    }
                    strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                    markerEnd={markerEnd}
                    opacity={isSelected || isHovered ? '1' : '0.6'}
                  />

                  {/* 起点 */}
                  <g>
                    <circle
                      cx={start.x}
                      cy={start.y}
                      r={
                        startPointSelected ? '5' : startPointHovered ? '6' : '3'
                      }
                      fill={
                        startPointSelected
                          ? '#ef4444'
                          : startPointHovered
                            ? '#fbbf24'
                            : '#f59e0b'
                      }
                      stroke={
                        startPointSelected
                          ? '#ef4444'
                          : startPointHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={
                        startPointSelected ? '2' : startPointHovered ? '3' : '1'
                      }
                      opacity={
                        startPointSelected || startPointHovered ? '1' : '0.8'
                      }
                    />
                    {/* 选中时的外层圆圈 */}
                    {startPointSelected && (
                      <circle
                        cx={start.x}
                        cy={start.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {startPointHovered && (
                      <circle
                        cx={start.x}
                        cy={start.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 起点序号标注 */}
                    <text
                      x={start.x + 8}
                      y={start.y - 8}
                      fill={
                        startPointSelected
                          ? '#ef4444'
                          : startPointHovered
                            ? '#fbbf24'
                            : '#f59e0b'
                      }
                      fontSize={
                        startPointSelected || startPointHovered ? '14' : '12'
                      }
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      1
                    </text>
                  </g>

                  {/* 终点 */}
                  <g>
                    <circle
                      cx={end.x}
                      cy={end.y}
                      r={endPointSelected ? '5' : endPointHovered ? '6' : '3'}
                      fill={
                        endPointSelected
                          ? '#ef4444'
                          : endPointHovered
                            ? '#fbbf24'
                            : '#f59e0b'
                      }
                      stroke={
                        endPointSelected
                          ? '#ef4444'
                          : endPointHovered
                            ? '#fbbf24'
                            : '#ffffff'
                      }
                      strokeWidth={
                        endPointSelected ? '2' : endPointHovered ? '3' : '1'
                      }
                      opacity={
                        endPointSelected || endPointHovered ? '1' : '0.8'
                      }
                    />
                    {/* 选中时的外层圆圈 */}
                    {endPointSelected && (
                      <circle
                        cx={end.x}
                        cy={end.y}
                        r="8"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 悬浮时的外层圆圈 */}
                    {endPointHovered && (
                      <circle
                        cx={end.x}
                        cy={end.y}
                        r="9"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    )}
                    {/* 终点序号标注 */}
                    <text
                      x={end.x + 8}
                      y={end.y - 8}
                      fill={
                        endPointSelected
                          ? '#ef4444'
                          : endPointHovered
                            ? '#fbbf24'
                            : '#f59e0b'
                      }
                      fontSize={
                        endPointSelected || endPointHovered ? '14' : '12'
                      }
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      2
                    </text>
                  </g>

                  {/* 文字标注 - 显示在箭头中心 */}
                  {measurement.description && (
                    <text
                      x={(start.x + end.x) / 2}
                      y={(start.y + end.y) / 2 + 5}
                      fill="#b45309"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {measurement.description}
                    </text>
                  )}
                </g>
              );
            }
            return null;
          })}
        {/* 绘制箭头预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'arrow' &&
          (() => {
            const start = imageToScreen(drawingState.startPoint);
            const end = imageToScreen(drawingState.currentPoint);
            return (
              <line
                key="arrow-preview"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#f59e0b"
                strokeWidth="2"
                markerEnd="url(#arrowhead-normal)"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            );
          })()}
        {/* 绘制多边形 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '多边形标注')
          .map(measurement => {
            const screenPoints = measurement.points.map(p => imageToScreen(p));
            const isSelected =
              selectionState.measurementId === measurement.id &&
              selectionState.type === 'whole';
            const isHovered =
              !isSelected &&
              hoverState.measurementId === measurement.id &&
              hoverState.elementType === 'whole';

            return (
              <polygon
                key={measurement.id}
                points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill={isSelected ? '#ef4444' : isHovered ? '#fbbf24' : 'none'}
                fillOpacity={isSelected ? '0.1' : isHovered ? '0.1' : '0'}
                stroke={
                  isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#06b6d4'
                }
                strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                opacity={isSelected || isHovered ? '1' : '0.6'}
              />
            );
          })}
        {/* 绘制多边形预览 - 使用 clickedPoints */}
        {selectedTool === 'polygon' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`polygon-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#06b6d4"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制连接线 */}
                {screenPoints.length > 1 && (
                  <>
                    {screenPoints.slice(0, -1).map((point, idx) => (
                      <line
                        key={`polygon-line-${idx}`}
                        x1={point.x}
                        y1={point.y}
                        x2={screenPoints[idx + 1].x}
                        y2={screenPoints[idx + 1].y}
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    ))}
                  </>
                )}
              </>
            );
          })()}
        {/* 绘制锥体中心 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '锥体中心')
          .map(measurement => {
            if (measurement.points.length !== 4) return null;

            const screenPoints = measurement.points.map(p => imageToScreen(p));
            const isSelected =
              selectionState.measurementId === measurement.id &&
              selectionState.type === 'whole';
            const isHovered =
              !isSelected &&
              hoverState.measurementId === measurement.id &&
              hoverState.elementType === 'whole';

            // 计算中心点
            const center = calculateQuadrilateralCenter(measurement.points);
            const centerScreen = imageToScreen(center);

            return (
              <g key={measurement.id}>
                {/* 绘制四边形轮廓 */}
                <polygon
                  points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                  }
                  strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                  opacity={isSelected || isHovered ? '1' : '0.6'}
                />

                {/* 绘制四个角点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`corner-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                    }
                    opacity="0.8"
                  />
                ))}

                {/* 绘制中心点标记 - 十字 + 圆圈 */}
                <g>
                  {/* 外圆 */}
                  <circle
                    cx={centerScreen.x}
                    cy={centerScreen.y}
                    r="8"
                    fill="none"
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                    }
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* 内圆 */}
                  <circle
                    cx={centerScreen.x}
                    cy={centerScreen.y}
                    r="3"
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                    }
                    opacity="0.9"
                  />
                  {/* 十字 - 水平线 */}
                  <line
                    x1={centerScreen.x - 12}
                    y1={centerScreen.y}
                    x2={centerScreen.x + 12}
                    y2={centerScreen.y}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                    }
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* 十字 - 垂直线 */}
                  <line
                    x1={centerScreen.x}
                    y1={centerScreen.y - 12}
                    x2={centerScreen.x}
                    y2={centerScreen.y + 12}
                    stroke={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                    }
                    strokeWidth="2"
                    opacity="0.9"
                  />
                </g>

                {/* 中心点文字标签 */}
                <text
                  x={centerScreen.x}
                  y={centerScreen.y - 18}
                  fill={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#10b981'
                  }
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.9"
                >
                  中心
                </text>
              </g>
            );
          })}
        {/* 绘制锥体中心预览 - 使用 clickedPoints */}
        {selectedTool === 'vertebra-center' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的角点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`vertebra-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#10b981"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制连接线 */}
                {screenPoints.length > 1 && (
                  <>
                    {screenPoints.slice(0, -1).map((point, idx) => (
                      <line
                        key={`vertebra-line-${idx}`}
                        x1={point.x}
                        y1={point.y}
                        x2={screenPoints[idx + 1].x}
                        y2={screenPoints[idx + 1].y}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    ))}
                    {/* 如果有3个或4个点，连接最后一个点到第一个点 */}
                    {screenPoints.length >= 3 && (
                      <line
                        key="vertebra-line-close"
                        x1={screenPoints[screenPoints.length - 1].x}
                        y1={screenPoints[screenPoints.length - 1].y}
                        x2={screenPoints[0].x}
                        y2={screenPoints[0].y}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    )}
                  </>
                )}
                {/* 如果已经有4个点，显示中心点预览 */}
                {clickedPoints.length === 4 &&
                  (() => {
                    const center = calculateQuadrilateralCenter(clickedPoints);
                    const centerScreen = imageToScreen(center);
                    return (
                      <g>
                        <circle
                          cx={centerScreen.x}
                          cy={centerScreen.y}
                          r="6"
                          fill="#10b981"
                          opacity="0.5"
                        />
                        <text
                          x={centerScreen.x}
                          y={centerScreen.y - 12}
                          fill="#10b981"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          中心
                        </text>
                      </g>
                    );
                  })()}
              </>
            );
          })()}
        {/* 绘制距离标注 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '距离标注')
          .map(measurement => {
            if (measurement.points.length !== 2) return null;

            const screenPoints = measurement.points.map(p => imageToScreen(p));
            const isSelected =
              selectionState.measurementId === measurement.id &&
              selectionState.type === 'whole';
            const isHovered =
              !isSelected &&
              hoverState.measurementId === measurement.id &&
              hoverState.elementType === 'whole';

            return (
              <g key={measurement.id}>
                {/* 绘制线段 */}
                <line
                  x1={screenPoints[0].x}
                  y1={screenPoints[0].y}
                  x2={screenPoints[1].x}
                  y2={screenPoints[1].y}
                  stroke={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#3b82f6'
                  }
                  strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                  opacity={isSelected || isHovered ? '1' : '0.8'}
                />
                {/* 绘制端点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#3b82f6'
                    }
                    opacity={isSelected || isHovered ? '1' : '0.8'}
                  />
                ))}
              </g>
            );
          })}
        {/* 绘制距离标注预览 - 使用 clickedPoints */}
        {selectedTool === 'aux-length' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`aux-length-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#3b82f6"
                    opacity="0.8"
                  />
                ))}
                {/* 如果有2个点，绘制线段和距离 */}
                {screenPoints.length === 2 &&
                  (() => {
                    const config = getAnnotationConfig('aux-length');
                    const results =
                      config?.calculateResults(clickedPoints, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                      }) || [];
                    const distanceText =
                      results.length > 0
                        ? `${results[0].value}${results[0].unit}`
                        : '';
                    const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
                    const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

                    return (
                      <>
                        <line
                          x1={screenPoints[0].x}
                          y1={screenPoints[0].y}
                          x2={screenPoints[1].x}
                          y2={screenPoints[1].y}
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.6"
                        />
                        <text
                          x={midX}
                          y={midY - 10}
                          fill="#3b82f6"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          {distanceText}
                        </text>
                      </>
                    );
                  })()}
              </>
            );
          })()}
        {/* TTS 工具的水平线预览（第二点自动约束为水平） */}
        {selectedTool.includes('ts') &&
          clickedPoints.length === 1 &&
          liveMouseImagePoint &&
          (() => {
            const firstPoint = imageToScreen(clickedPoints[0]);
            const constrainedSecondPoint = imageToScreen({
              x: liveMouseImagePoint.x,
              y: clickedPoints[0].y, // 约束Y坐标与第一个点相同
            });
            return (
              <line
                x1={firstPoint.x}
                y1={firstPoint.y}
                x2={constrainedSecondPoint.x}
                y2={constrainedSecondPoint.y}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            );
          })()}
        {/* 绘制辅助水平/垂直线段预览（第二点自动约束） */}
        {(selectedTool === 'aux-horizontal-line' ||
          selectedTool === 'aux-vertical-line') &&
          clickedPoints.length > 0 &&
          (() => {
            const previewPoints = [...clickedPoints];
            if (clickedPoints.length === 1 && liveMouseImagePoint) {
              previewPoints.push(
                constrainAuxLinePoint(
                  selectedTool,
                  clickedPoints[0],
                  liveMouseImagePoint
                )
              );
            }

            const screenPreviewPoints = previewPoints.map(p =>
              imageToScreen(p)
            );

            return (
              <>
                {screenPreviewPoints.map((point, idx) => (
                  <circle
                    key={`aux-orth-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#22c55e"
                    opacity="0.85"
                  />
                ))}

                {screenPreviewPoints.length === 2 && (
                  <line
                    x1={screenPreviewPoints[0].x}
                    y1={screenPreviewPoints[0].y}
                    x2={screenPreviewPoints[1].x}
                    y2={screenPreviewPoints[1].y}
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                )}
              </>
            );
          })()}
        {/* 绘制角度标注 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '角度标注')
          .map(measurement => {
            if (measurement.points.length !== 3) return null;

            const screenPoints = measurement.points.map(p => imageToScreen(p));
            const isSelected =
              selectionState.measurementId === measurement.id &&
              selectionState.type === 'whole';
            const isHovered =
              !isSelected &&
              hoverState.measurementId === measurement.id &&
              hoverState.elementType === 'whole';

            // 计算角度值
            const config = getAnnotationConfig('aux-angle');
            const results =
              config?.calculateResults(measurement.points, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
              }) || [];
            const angleText =
              results.length > 0 ? `${results[0].value}${results[0].unit}` : '';

            return (
              <g key={measurement.id}>
                {/* 绘制两条线段 */}
                <line
                  x1={screenPoints[0].x}
                  y1={screenPoints[0].y}
                  x2={screenPoints[1].x}
                  y2={screenPoints[1].y}
                  stroke={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#8b5cf6'
                  }
                  strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                  opacity={isSelected || isHovered ? '1' : '0.8'}
                />
                <line
                  x1={screenPoints[1].x}
                  y1={screenPoints[1].y}
                  x2={screenPoints[2].x}
                  y2={screenPoints[2].y}
                  stroke={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#8b5cf6'
                  }
                  strokeWidth={isSelected ? '3' : isHovered ? '3' : '2'}
                  opacity={isSelected || isHovered ? '1' : '0.8'}
                />
                {/* 绘制三个点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={
                      isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#8b5cf6'
                    }
                    opacity={isSelected || isHovered ? '1' : '0.8'}
                  />
                ))}
                {/* 绘制角度文字（在顶点上方） */}
                <text
                  x={screenPoints[1].x}
                  y={screenPoints[1].y - 15}
                  fill={
                    isSelected ? '#ef4444' : isHovered ? '#fbbf24' : '#8b5cf6'
                  }
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.9"
                >
                  {angleText}
                </text>
              </g>
            );
          })}
        {/* 绘制角度标注预览 - 使用 clickedPoints */}
        {selectedTool === 'aux-angle' &&
          clickedPoints.length > 0 &&
          (() => {
            const screenPoints = clickedPoints.map(p => imageToScreen(p));
            return (
              <>
                {/* 绘制已添加的点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`aux-angle-point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#8b5cf6"
                    opacity="0.8"
                  />
                ))}
                {/* 绘制线段 */}
                {screenPoints.length >= 2 && (
                  <line
                    x1={screenPoints[0].x}
                    y1={screenPoints[0].y}
                    x2={screenPoints[1].x}
                    y2={screenPoints[1].y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                )}
                {screenPoints.length >= 4 && (
                  <line
                    x1={screenPoints[2].x}
                    y1={screenPoints[2].y}
                    x2={screenPoints[3].x}
                    y2={screenPoints[3].y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                )}
                {screenPoints.length === 4 && (
                  <>
                    {(() => {
                      const config = getAnnotationConfig('aux-angle');
                      const results =
                        config?.calculateResults(clickedPoints, {
                          standardDistance,
                          standardDistancePoints,
                          imageNaturalSize,
                        }) || [];
                      const angleText =
                        results.length > 0
                          ? `${results[0].value}${results[0].unit}`
                          : '';
                      const centerPoint = {
                        x:
                          (screenPoints[0].x +
                            screenPoints[1].x +
                            screenPoints[2].x +
                            screenPoints[3].x) /
                          4,
                        y:
                          (screenPoints[0].y +
                            screenPoints[1].y +
                            screenPoints[2].y +
                            screenPoints[3].y) /
                          4,
                      };
                      return (
                        <text
                          x={centerPoint.x}
                          y={centerPoint.y - 15}
                          fill="#8b5cf6"
                          fontSize="12"
                          textAnchor="middle"
                          opacity="0.7"
                        >
                          {angleText}
                        </text>
                      );
                    })()}
                  </>
                )}
              </>
            );
          })()}
        {/* 选中边界框和删除按钮 */}
        {(() => {
          // 获取选中的对象
          let selectedPoints: Point[] = [];
          let selectedMeasurement: any = null;

          if (selectionState.measurementId) {
            // 选中了测量结果（优化：使用selectionState）
            const measurement = measurements.find(
              m => m.id === selectionState.measurementId
            );
            if (measurement) {
              selectedMeasurement = measurement;
              if (
                selectionState.type === 'point' &&
                selectionState.pointIndex !== null
              ) {
                // 只显示选中的点
                selectedPoints = [
                  measurement.points[selectionState.pointIndex],
                ];
              } else {
                // 显示整个测量结果
                selectedPoints = measurement.points;
              }
            }
          } else if (
            selectionState.pointIndex !== null &&
            clickedPoints[selectionState.pointIndex]
          ) {
            // 选中了单个点
            selectedPoints = [clickedPoints[selectionState.pointIndex]];
          }

          if (selectedPoints.length === 0) return null;

          // 计算边界框
          let minX: number, maxX: number, minY: number, maxY: number;

          // 针对不同类型的图形计算不同的边界框（优化：使用selectionState）
          if (selectedMeasurement && selectionState.type === 'whole') {
            // 辅助图形需要特殊处理
            if (
              selectedMeasurement.type === '圆形标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const center = selectedMeasurement.points[0];
              const edge = selectedMeasurement.points[1];
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const screenRadius = Math.sqrt(
                Math.pow(screenEdge.x - screenCenter.x, 2) +
                  Math.pow(screenEdge.y - screenCenter.y, 2)
              );

              minX = screenCenter.x - screenRadius - 15;
              maxX = screenCenter.x + screenRadius + 15;
              minY = screenCenter.y - screenRadius - 15;
              maxY = screenCenter.y + screenRadius + 15;
            } else if (
              selectedMeasurement.type === '椭圆标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const center = selectedMeasurement.points[0];
              const edge = selectedMeasurement.points[1];
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const screenRadiusX = Math.abs(screenEdge.x - screenCenter.x);
              const screenRadiusY = Math.abs(screenEdge.y - screenCenter.y);

              minX = screenCenter.x - screenRadiusX - 15;
              maxX = screenCenter.x + screenRadiusX + 15;
              minY = screenCenter.y - screenRadiusY - 15;
              maxY = screenCenter.y + screenRadiusY + 15;
            } else if (
              selectedMeasurement.type === '矩形标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const start = selectedMeasurement.points[0];
              const end = selectedMeasurement.points[1];
              const startScreen = imageToScreen(start);
              const endScreen = imageToScreen(end);

              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else if (
              selectedMeasurement.type === '箭头标注' &&
              selectedMeasurement.points.length >= 2
            ) {
              const start = selectedMeasurement.points[0];
              const end = selectedMeasurement.points[1];
              const startScreen = imageToScreen(start);
              const endScreen = imageToScreen(end);

              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else {
              // 默认处理：基于标注点位置
              const screenPoints = selectedPoints.map(p => imageToScreen(p));
              const xs = screenPoints.map(p => p.x);
              const ys = screenPoints.map(p => p.y);
              minX = Math.min(...xs) - 15;
              maxX = Math.max(...xs) + 15;
              minY = Math.min(...ys) - 15;
              maxY = Math.max(...ys) + 15;
            }
          } else {
            // 点选择模式或普通测量：基于标注点位置
            const screenPoints = selectedPoints.map(p => imageToScreen(p));
            const xs = screenPoints.map(p => p.x);
            const ys = screenPoints.map(p => p.y);
            minX = Math.min(...xs) - 15;
            maxX = Math.max(...xs) + 15;
            minY = Math.min(...ys) - 15;
            maxY = Math.max(...ys) + 15;
          }

          const width = maxX - minX;
          const height = maxY - minY;

          return (
            <g>
              {/* 边界框 */}
              <rect
                x={minX}
                y={minY}
                width={width}
                height={height}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />
            </g>
          );
        })()}
      </svg>

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 max-w-md">
        {selectedTool.toLowerCase() === 'cobb' && (
          <div className="bg-black/75 border border-yellow-400/40 text-white text-xs px-3 py-2 rounded">
            <p className="font-medium text-yellow-300">Cobb 点位顺序提示</p>
            <p className="mt-1">
              1 上端椎左 | 2 上端椎右 | 3 下端椎左 | 4 下端椎右
            </p>
          </div>
        )}

        <div className="bg-black/70 text-white text-xs px-3 py-2 rounded">
          {selectedTool === 'hand' ? (
            <div>
              <p className="font-medium">
                移动模式{' '}
                {isImagePanLocked && (
                  <span className="text-yellow-400">🔒 图像已锁定</span>
                )}
              </p>
              <p>点击选中标注 | 拖拽移动 | 点击删除按钮删除</p>
              <p className="text-gray-400 mt-1">
                {isImagePanLocked
                  ? '图像已锁定，拖拽不会移动图像'
                  : '或拖拽移动图像'}{' '}
                | 滚轮缩放
              </p>
            </div>
          ) : selectedTool === 'polygon' ? (
            <div>
              <p className="font-medium">多边形标注模式</p>
              <p>已标注 {clickedPoints.length} 个点</p>
              {clickedPoints.length < 3 ? (
                <p className="text-yellow-400 mt-1">至少需要3个点</p>
              ) : (
                <div className="text-green-400 mt-1">
                  <p>点击回第一个点自动闭合</p>
                  <p>Alt+Z 撤销点</p>
                </div>
              )}
            </div>
          ) : selectedTool === 'vertebra-center' ? (
            <div>
              <p className="font-medium">锥体中心标注模式</p>
              <p>已标注 {clickedPoints.length}/4 个角点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个角点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击第2个角点</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-yellow-400 mt-1">点击第3个角点</p>
              )}
              {clickedPoints.length === 3 && (
                <div className="text-green-400 mt-1">
                  <p>点击第4个角点完成标注</p>
                  <p>中心点将自动计算</p>
                </div>
              )}
            </div>
          ) : selectedTool === 'aux-length' ? (
            <div>
              <p className="font-medium">距离标注模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击起点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击终点完成测量</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-green-400 mt-1">
                  距离已计算（根据标准距离换算）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-horizontal-line' ? (
            <div>
              <p className="font-medium">辅助水平线段模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">
                  点击第2个点（自动保持水平）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-vertical-line' ? (
            <div>
              <p className="font-medium">辅助垂直线段模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第1个点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">
                  点击第2个点（自动保持垂直）
                </p>
              )}
            </div>
          ) : selectedTool === 'aux-angle' ? (
            <div>
              <p className="font-medium">角度标注模式（两条线段）</p>
              <p>已标注 {clickedPoints.length}/4 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击第一条线段的起点</p>
              )}
              {clickedPoints.length === 1 && (
                <p className="text-yellow-400 mt-1">点击第一条线段的终点</p>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-yellow-400 mt-1">点击第二条线段的起点</p>
              )}
              {clickedPoints.length === 3 && (
                <p className="text-yellow-400 mt-1">
                  点击第二条线段的终点完成测量
                </p>
              )}
              {clickedPoints.length === 4 && (
                <p className="text-green-400 mt-1">角度已计算</p>
              )}
            </div>
          ) : selectedTool.includes('t1-tilt') ? (
            <div>
              <p className="font-medium">T1 Tilt 测量模式</p>
              <p>已标注 {clickedPoints.length}/2 个点</p>
              {clickedPoints.length === 0 && (
                <p className="text-yellow-400 mt-1">点击T1椎体上终板起点</p>
              )}
              {clickedPoints.length === 1 && (
                <>
                  <p className="text-green-400 mt-1">水平参考线已显示</p>
                  <p className="text-yellow-400 mt-1">点击上终板终点完成测量</p>
                </>
              )}
              {clickedPoints.length === 2 && (
                <p className="text-green-400 mt-1">T1 Tilt角度已计算</p>
              )}
            </div>
          ) : (
            <div>
              <p className="font-medium">测量模式: {currentTool?.name}</p>
              <p>
                已标注 {clickedPoints.length}/{pointsNeeded} 个点
                {currentTool &&
                  getInheritedPoints(currentTool.id, measurements).count >
                    0 && (
                    <span className="text-cyan-400 ml-2 text-xs">
                      (+{getInheritedPoints(currentTool.id, measurements).count}
                      个点已自动继承)
                    </span>
                  )}
              </p>
              {clickedPoints.length < pointsNeeded && (
                <p className="text-yellow-400 mt-1">点击图像标注关键点</p>
              )}
            </div>
          )}
          {isHovering && <p className="text-blue-400 mt-1">滚轮缩放已激活</p>}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
          }}
          className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleEditLabel}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          >
            <span>✏️</span>
            <span>编辑文字</span>
          </button>
          <button
            onClick={handleDeleteShape}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            <span>🗑️</span>
            <span>删除图形</span>
          </button>
        </div>
      )}

      {/* 文字编辑对话框 */}
      {editLabelDialog.visible && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          onClick={handleCancelEdit}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-300"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">编辑图形文字</h3>
            <input
              type="text"
              value={editLabelDialog.currentLabel}
              onChange={e =>
                setEditLabelDialog(prev => ({
                  ...prev,
                  currentLabel: e.target.value,
                }))
              }
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveLabel();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入文字标注..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveLabel}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
