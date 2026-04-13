'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, authenticatedBlobFetch, useUser } from '@/lib/api';
import {
  extractData,
  extractPaginatedData,
} from '@/lib/api/types';
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
import { CalculationContext } from './catalog/annotation-catalog';
import {
  calculateMeasurementValue as calcMeasurementValue,
} from './domain/annotation-calculation';
import { getInheritedPoints } from './domain/annotation-inheritance';
import { getDescriptionForType as getDesc } from './domain/annotation-metadata';
import { getToolsForExamType as getTools } from './catalog/exam-tool-catalog';
import { useAnnotationEngine } from './hooks/useAnnotationEngine';
import { useAnnotationPersistence } from './hooks/useAnnotationPersistence';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useImageStudy } from './hooks/useImageStudy';
import { useMeasurements } from './hooks/useMeasurements';
import {ImageSize, MeasurementData, Point} from './types';
import {useStudyDataLoader} from "@/app/imaging/viewer/image-viewer/hooks/useStudyDataLoader";
import {useLocalAnnotationsDataLoader} from "@/app/imaging/viewer/image-viewer/hooks/useLocalAnnotationsDataLoader";
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

interface ImageViewerProps {
  imageId: string;
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
  } = useMeasurements();
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
  } = useCanvasInteraction();
  const {
    isSaving,
    setIsSaving,
    isMeasurementsLoading,
    setIsMeasurementsLoading,
    saveMessage,
    setSaveMessage,
  } = useAnnotationPersistence();
  const {
    studyData,
    setStudyData,
    studyLoading,
    setStudyLoading,
    imageList,
    setImageList,
    imageNaturalSize,
    setImageNaturalSize,
  } = useImageStudy();

  // 清空所有测量数据
  const clearAllMeasurements = () => {
    setMeasurements([]);
    setClickedPoints([]);
    setPointBindings(createEmptyBindings()); // 同时清除点绑定
  };
  // 权限检查：判断当前用户是否为管理员
  const isAdmin = useMemo(() => {
    if (!user) return false;
    // 超级管理员或系统管理员都算作admin
    return user.is_superuser === true || user.is_system_admin === true;
  }, [user]);

  // AI检测和测量
  const [isAIDetecting, setIsAIDetecting] = useState(false);
  const [isAIMeasuring, setIsAIMeasuring] = useState(false);
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
  useStudyDataLoader(
      imageId,
      setStudyData,
      setStudyLoading,
      setMeasurements,
      setStandardDistance,
      setStandardDistancePoints,
      setPointBindings,
      dbAnnotationLoadedRef,
  )

  // 当图像尺寸确定后，自动加载标注数据
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
      calcMeasurementValue,
      getDesc,
  )

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
      currentTool.id === 'll-l1-l4' ||  // LL L1-L4: 继承点在索引0-1，手动点在2-3
      currentTool.id === 'll-l4-s1' ||
      currentTool.id === 'pi' ||
      currentTool.id === 'pt' ||
      currentTool.id === 'tpa' ||
      currentTool.id === 'c7-offset' ||  // C7 Offset: 继承点在索引4-5，手动点在0-3
      currentTool.id === 'ts'            // TTS: 继承点在索引2-3，手动点在0-1
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

  const addMeasurement = (type: string, points: Point[] = []) => {
    // 如果是Cobb工具，自动编号（统一处理 'cobb' 和 'Cobb'）
    let finalType = type;
    const isCobb = type.toLowerCase() === 'cobb';
    if (isCobb) {
      const cobbCount = measurements.filter(m =>
        m.type.startsWith('Cobb')
      ).length;
      finalType = `Cobb${cobbCount + 1}`;
    }

    // 查找工具ID用于配置查找
    // 优先使用工具对象的ID，如果是Cobb则使用'cobb'，否则通过名称反查ID
    let configLookupType = finalType;
    if (isCobb) {
      configLookupType = 'cobb';
    } else {
      const tool = tools.find(t => t.name === type);
      if (tool) {
        configLookupType = tool.id;
      }
    }

    // 使用统一的配置系统计算测量值
    const defaultValue =
      calcMeasurementValue(configLookupType, points, {
        standardDistance,
        standardDistancePoints,
        imageNaturalSize,
      }) || '0.0°';
    const description = isCobb ? 'Cobb角测量' : getDesc(finalType);

    const newMeasurement: MeasurementData = {
      id: Date.now().toString(),
      type: finalType, // 使用编号后的类型（Cobb1, Cobb2, Cobb3...）
      value: defaultValue,
      points: points,
      description,
    };

    setMeasurements(prev => {
      // 将本次新增标注加入列表
      const accumulated: MeasurementData[] = [...prev, newMeasurement];

      // 检查是否有其他工具的全部点位均可由继承/共享获得，若是则自动创建对应标注
      for (const tool of tools) {
        if (!tool.pointsNeeded || tool.pointsNeeded <= 0) continue;
        // 已存在该类型的标注则跳过
        if (accumulated.some(m => m.type === tool.name)) continue;

        const { points: inheritedPts, count } = getInheritedPoints(
          tool.id,
          accumulated
        );
        if (count >= tool.pointsNeeded) {
          // 所有点位均可由已有标注推导出，自动创建
          const autoPoints = inheritedPts.slice(0, tool.pointsNeeded);
          const autoValue =
            calcMeasurementValue(tool.id, autoPoints, {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
            }) || '0.0°';
          const autoMeasurement: MeasurementData = {
            id: `${Date.now()}-auto-${tool.id}-${accumulated.length}`,
            type: tool.name,
            value: autoValue,
            points: autoPoints,
            description: getDesc(tool.name),
          };
          // 立即追加到 accumulated，以便后续工具可以从本次自动创建的标注中继续推导
          accumulated.push(autoMeasurement);
        }
      }

      return accumulated;
    });
  };

  useEffect(() => {
    const fetchImageList = async () => {
      try {
        const response = await apiClient.get(
          '/api/v1/image-files?page=1&page_size=100'
        );

        // 使用 extractPaginatedData 提取影像列表
        const result = extractPaginatedData<any>(response);

        // 从API响应中提取影像ID，格式为IMG{id}
        const ids = result.items.map((item: any) => {
          // 使用item.id来生成影像ID
          return `IMG${item.id.toString().padStart(3, '0')}`;
        });
        setImageList(ids);
      } catch (error) {
        console.error('获取影像列表失败:', error);
        // 如果获取失败，使用空列表
        setImageList([]);
      }
    };

    fetchImageList();
  }, []);

  const currentIndex = imageList.indexOf(imageId);

  const generateReport = async () => {
    if (measurements.length === 0) {
      setReportText('暂无测量数据，无法生成报告。请先进行相关测量。');
      return;
    }

    try {
      // 调用后端API生成报告
      const response = await apiClient.post('/api/v1/report-generation/generate', {
        imageId: imageId,
        examType: imageData.examType,
        measurements: measurements.map(m => ({
          type: m.type,
          value: m.value,
          description: m.description,
        })),
      });

      if (response.status === 200) {
        // 使用 extractData 提取报告数据
        const result = extractData<{ report: string }>(response);
        if (result.report) {
          setReportText(result.report);
          setSaveMessage('报告生成成功');
          setTimeout(() => setSaveMessage(''), 3000);
        } else {
          throw new Error('报告生成失败');
        }
      } else {
        throw new Error('报告生成失败');
      }
    } catch (error) {
      console.error('生成报告失败:', error);

      // 如果API调用失败，使用本地简单生成作为后备方案
      let report = `【${imageData.examType}测量报告】\n\n`;
      report += `患者：${imageData.patientName} (${imageData.patientId})\n`;
      report += `检查日期：${imageData.studyDate}\n`;
      report += `影像类型：${imageData.examType}\n\n`;

      report += `【测量结果】\n`;
      measurements.forEach((measurement, index) => {
        report += `${index + 1}. ${measurement.type}：${measurement.value}\n`;
        if (measurement.description) {
          report += `   ${measurement.description}\n`;
        }
      });

      report += `\n【分析建议】\n`;

      // 根据不同影像类型生成专业分析
      if (imageData.examType === '正位X光片') {
        // 查找 Cobb 测量（可能是 Cobb、Cobb1、Cobb2 等）
        const cobbMeasurement = measurements.find(m =>
          m.type.startsWith('Cobb')
        );
        const caMeasurement = measurements.find(m => m.type === 'CA');

        if (cobbMeasurement) {
          const cobbValue = parseFloat(cobbMeasurement.value);
          if (cobbValue > 10) {
            report += `• 脊柱侧弯程度：${cobbValue < 25 ? '轻度' : cobbValue < 40 ? '中度' : '重度'}（${cobbMeasurement.type} ${cobbMeasurement.value}）\n`;
          }
        }

        if (caMeasurement) {
          const caValue = parseFloat(caMeasurement.value);
          if (caValue > 10) {
            report += `• 双肩高度差异明显，提示存在肩部不平衡\n`;
          }
        }
      } else if (imageData.examType === '侧位X光片') {
        const tkMeasurement = measurements.find(m => m.type === 'TK');
        const llMeasurement = measurements.find(m => m.type === 'LL');
        const svaMeasurement = measurements.find(m => m.type === 'SVA');

        if (tkMeasurement) {
          report += `• 胸椎后凸角：${tkMeasurement.value}，形态${parseFloat(tkMeasurement.value) > 40 ? '偏大' : '正常'}\n`;
        }

        if (llMeasurement) {
          report += `• 腰椎前凸角：${llMeasurement.value}，弯曲${parseFloat(llMeasurement.value) < 40 ? '偏小' : '正常'}\n`;
        }

        if (svaMeasurement) {
          const svaValue = parseFloat(svaMeasurement.value);
          if (svaValue > 40) {
            report += `• 矢状面平衡异常，存在前倾趋势\n`;
          }
        }
      }

      report += `\n报告生成时间：${new Date().toLocaleString('zh-CN')}\n`;
      report += `系统：AI辅助测量分析`;

      setReportText(report);
      setSaveMessage('使用本地模式生成报告');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

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

          return {
            id:
              Date.now().toString() +
              Math.random().toString(36).substring(2, 11),
            type: m.type,
            value: isAIDetection
              ? m.value || ''
              : calculateMeasurementValue(m.type, scaledPoints),
            points: scaledPoints,
            description: isAIDetection
              ? m.description || m.type
              : getDescriptionForType(m.type),
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
      // 获取图片文件
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';

      // 先获取图片
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const imageBlob = await authenticatedBlobFetch(
        `${apiUrl}/api/v1/image-files/${numericId}/download`
      );

      // 构建FormData
      const formData = new FormData();
      formData.append('file', imageBlob, 'image.png');
      formData.append('image_id', imageId);

      // 根据examType选择不同的AI测量接口
      let aiDetectUrl: string;
      if (imageData.examType === '侧位X光片') {
        // 侧位使用专用测量接口
        aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_URL || '';
        if (!aiDetectUrl) {
          throw new Error(
            '侧位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_LATERAL_URL'
          );
        }
      } else {
        // 正位或其他类型使用默认接口
        aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_URL || '';
        if (!aiDetectUrl) {
          throw new Error(
            '正位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_URL'
          );
        }
      }

      console.log('🤖 使用AI测量接口:', aiDetectUrl);

      const aiResponse = await fetch(aiDetectUrl, {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error('AI测量失败');
      }

      const aiData = await aiResponse.json();

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

        const tools = getTools(imageData.examType);

        // 统计已有的Cobb角数量（用于自动编号）
        let cobbCount = measurements.filter(m =>
          m.type.startsWith('Cobb')
        ).length;

        const aiMeasurements = aiData.measurements
          .filter((m: any) => {
            // 检查标注类型是否存在于配置中
            // 优先匹配 name（精确匹配），然后匹配 id（小写匹配），最后匹配 name（不区分大小写）
            const tool = tools.find(
              (t: any) =>
                t.name === m.type ||
                t.id === m.type.toLowerCase() ||
                t.name.toLowerCase() === m.type.toLowerCase() ||
                // 特殊处理：所有Cobb-*类型都匹配到cobb工具
                (m.type.startsWith('Cobb-') && t.id === 'cobb')
            );

            if (!tool) return false;

            // SVA 改为 5 点法：AI 返回的 SVA 非 5 点时直接过滤，不显示
            if (tool.id === 'sva') {
              return Array.isArray(m.points) && m.points.length === 5;
            }

            return true;
          })
          .map((m: any) => {
            // 获取该标注类型所需的点数
            const tools = getTools(imageData.examType);
            const tool = tools.find(
              (t: any) =>
                t.name === m.type ||
                t.id === m.type.toLowerCase() ||
                t.name.toLowerCase() === m.type.toLowerCase() ||
                (m.type.startsWith('Cobb-') && t.id === 'cobb')
            );
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
            let finalType = m.type;
            let isCobb = false;
            if (m.type.startsWith('Cobb-')) {
              cobbCount++;
              finalType = `Cobb${cobbCount}`;
              isCobb = true;
            }

            // 根据type和points重新计算value
            // 对于Cobb类型，使用'cobb'配置；其他类型使用原始类型
            const typeForCalculation = isCobb ? 'cobb' : m.type;
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
                : getDescriptionForType(m.type),
              originalType: m.type, // 保留原始类型用于调试
              // 保存椎体信息（仅Cobb角有）
              upperVertebra: m.upper_vertebra,
              lowerVertebra: m.lower_vertebra,
              apexVertebra: m.apex_vertebra,
            };
          });

        setMeasurements(aiMeasurements);
        // AI 返回后执行一次基于坐标重合的自动绑定
        const S1_RELATED_TYPES = new Set([
          'SS',
          'LL L1-S1',
          'LL L4-S1',
          'PI',
          'PT',
          'TPA',
        ]);
        const s1Count = aiMeasurements.filter((m: any) =>
          S1_RELATED_TYPES.has(m.type)
        ).length;
        const s1Bindings =
          s1Count >= 2
            ? autoCreateS1Bindings(aiMeasurements)
            : createEmptyBindings();
        const posBindings = autoCreatePositionBindings(aiMeasurements);
        setPointBindings(mergeBindings(s1Bindings, posBindings));
        setSaveMessage(`AI测量完成，已加载 ${aiMeasurements.length} 个标注`);
        setTimeout(() => setSaveMessage(''), 3000);
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

  // AI检测函数（仅检测椎骨，不包含测量）- 仅管理员可用
  const handleAIDetection = async () => {
    // 权限检查
    if (!isAdmin) {
      setSaveMessage('无权限：仅管理员可以使用AI检测功能');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsAIDetecting(true);
    setSaveMessage('');

    try {
      // 获取图像元素
      const imgElement = document.querySelector(
        '[data-image-canvas] img'
      ) as HTMLImageElement;
      if (!imgElement) {
        setSaveMessage('未找到图像元素');
        setTimeout(() => setSaveMessage(''), 3000);
        setIsAIDetecting(false);
        return;
      }

      // 将图像转换为Blob
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        ctx.drawImage(imgElement, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('无法生成图像'));
        }, 'image/png');
      });

      // 构建FormData
      const formData = new FormData();
      formData.append('file', imageBlob, 'image.png');

      // 根据examType选择不同的AI检测接口
      let aiDetectUrl: string;
      if (imageData.examType === '侧位X光片') {
        // 侧位使用 /api/detect 接口（返回椎体4个角点）
        aiDetectUrl =
          process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL || '';
        if (!aiDetectUrl) {
          throw new Error(
            '侧位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL'
          );
        }
      } else {
        // 正位使用 detect_keypoints 接口
        aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL || '';
        if (!aiDetectUrl) {
          throw new Error(
            '正位X光片AI关键点检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL'
          );
        }
      }

      console.log('🤖 使用AI检测接口:', aiDetectUrl);

      const aiResponse = await fetch(aiDetectUrl, {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error('AI检测失败');
      }

      const aiData = await aiResponse.json();
      console.log('AI检测返回数据:', aiData);

      // 处理检测结果，将关键点转换为可视化标注
      const detectionMeasurements: MeasurementData[] = [];
      let pointCount = 0;

      // 判断是侧位还是正位，使用不同的数据处理逻辑
      if (imageData.examType === '侧位X光片') {
        // 侧位：处理 /api/detect 返回的数据
        // 数据格式：{ vertebrae: [...], cfh: {...}, image_width, image_height }

        const imageWidth = aiData.image_width;
        const imageHeight = aiData.image_height;

        // 处理椎体检测结果
        if (aiData.vertebrae && Array.isArray(aiData.vertebrae)) {
          console.log(`🔍 原始检测到 ${aiData.vertebrae.length} 个椎体`);
          console.log(
            '原始椎体列表:',
            aiData.vertebrae
              .map(
                (v: any) => `${v.label}(${(v.confidence * 100).toFixed(1)}%)`
              )
              .join(', ')
          );

          // 1. 过滤掉置信度过低的检测（< 0.5）
          const highConfidenceVertebrae = aiData.vertebrae.filter(
            (v: any) => v.confidence >= 0.1
          );
          console.log(
            `🔍 过滤后剩余 ${highConfidenceVertebrae.length} 个高置信度椎体`
          );

          // 2. 去重：同一个椎体只保留置信度最高的
          const vertebraeMap = new Map<string, any>();
          highConfidenceVertebrae.forEach((vertebra: any) => {
            const existing = vertebraeMap.get(vertebra.label);
            if (!existing || vertebra.confidence > existing.confidence) {
              vertebraeMap.set(vertebra.label, vertebra);
            }
          });

          const uniqueVertebrae = Array.from(vertebraeMap.values());
          console.log(`✅ 去重后剩余 ${uniqueVertebrae.length} 个唯一椎体`);
          console.log(
            '最终椎体列表:',
            uniqueVertebrae
              .map(
                (v: any) => `${v.label}(${(v.confidence * 100).toFixed(1)}%)`
              )
              .join(', ')
          );

          // 3. 处理每个椎体的4个角点
          uniqueVertebrae.forEach((vertebra: any) => {
            if (!vertebra.keypoints || vertebra.keypoints.length !== 4) {
              console.warn(
                `⚠️ 椎体 ${vertebra.label} 的关键点数量不是4个:`,
                vertebra.keypoints?.length
              );
              return;
            }

            // 椎体的4个角点（归一化坐标，需要转换为像素坐标）
            const keypoints = vertebra.keypoints.map((kp: any) => ({
              x: kp.x * imageWidth,
              y: kp.y * imageHeight,
            }));

            // 按1、2、3、4编号显示4个角点
            keypoints.forEach((point: any, index: number) => {
              const cornerNum = index + 1;
              const cornerNames = ['左上', '右上', '左下', '右下'];

              // 生成唯一ID（使用时间戳+随机数）
              const uniqueId = `ai-detection-${vertebra.label}-${cornerNum}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

              detectionMeasurements.push({
                id: uniqueId,
                type: `AI检测-${vertebra.label}-${cornerNum}`,
                value: `${vertebra.label}-${cornerNum}`,
                points: [point],
                description: `AI检测-${vertebra.label}角点${cornerNum}(${cornerNames[index]}) (置信度: ${(vertebra.confidence * 100).toFixed(1)}%)`,
              });
              pointCount++;
            });
          });

          console.log(`✅ 共生成 ${pointCount} 个椎体角点`);
        }

        // 处理股骨头检测结果
        if (aiData.cfh && aiData.cfh.center) {
          const cfhCenter = {
            x: aiData.cfh.center.x * imageWidth,
            y: aiData.cfh.center.y * imageHeight,
          };

          detectionMeasurements.push({
            id: 'ai-detection-cfh',
            type: 'AI检测-CFH',
            value: 'CFH',
            points: [cfhCenter],
            description: `AI检测-股骨头中心 (置信度: ${(aiData.cfh.confidence * 100).toFixed(1)}%)`,
          });
          pointCount++;
        }
      } else {
        // 正位：处理原有的 detect_keypoints 返回的数据
        // 1. 处理躯干关键点 (pose_keypoints) - 对象格式
        if (
          aiData.pose_keypoints &&
          typeof aiData.pose_keypoints === 'object'
        ) {
          Object.entries(aiData.pose_keypoints).forEach(
            ([label, kp]: [string, any]) => {
              if (kp && kp.x !== undefined && kp.y !== undefined) {
                detectionMeasurements.push({
                  id: `ai-detection-pose-${label}`,
                  type: `AI检测-${label}`,
                  value: label,
                  points: [{ x: kp.x, y: kp.y }],
                  description: `AI检测-躯干关键点 (置信度: ${(kp.confidence * 100).toFixed(1)}%)`,
                });
                pointCount++;
              }
            }
          );
        }

        // 2. 处理椎骨关键点 (vertebrae) - 对象格式，显示4个角点
        if (aiData.vertebrae && typeof aiData.vertebrae === 'object') {
          Object.entries(aiData.vertebrae).forEach(
            ([label, vertebra]: [string, any]) => {
              if (!vertebra || !vertebra.corners) return;

              // 添加椎骨的4个角点，按1、2、3、4编号
              const corners = vertebra.corners;
              const cornerNames = [
                { key: 'top_left', num: '1', displayName: '左上' },
                { key: 'top_right', num: '2', displayName: '右上' },
                { key: 'bottom_right', num: '3', displayName: '右下' },
                { key: 'bottom_left', num: '4', displayName: '左下' },
              ];

              cornerNames.forEach(corner => {
                const point = corners[corner.key];
                if (point && point.x !== undefined && point.y !== undefined) {
                  detectionMeasurements.push({
                    id: `ai-detection-${label}-${corner.num}`,
                    type: `AI检测-${label}-${corner.num}`,
                    value: `${label}-${corner.num}`,
                    points: [{ x: point.x, y: point.y }],
                    description: `AI检测-${label}角点${corner.num}(${corner.displayName}) (置信度: ${(vertebra.confidence * 100).toFixed(1)}%)`,
                  });
                  pointCount++;
                }
              });
            }
          );
        }
      }

      // 3. 清除之前的AI检测结果，然后添加新的检测结果
      if (detectionMeasurements.length > 0) {
        // 先清除所有AI检测的标注（type以"AI检测-"开头的）
        setMeasurements(prev => {
          const nonAIDetections = prev.filter(
            m => !m.type.startsWith('AI检测-')
          );
          return [...nonAIDetections, ...detectionMeasurements];
        });
        setSaveMessage(`AI检测完成，检测到 ${pointCount} 个关键点`);
      } else {
        setSaveMessage('AI检测完成，但未检测到关键点');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('AI检测失败:', error);
      setSaveMessage('AI检测失败，请检查服务是否正常运行');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsAIDetecting(false);
    }
  };

  // 保存标注数据到数据库
  const saveAnnotationsToDatabase = async () => {
    if (measurements.length === 0) {
      setSaveMessage('暂无测量数据需要保存');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('正在保存...');

    try {
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
      const annotationData = {
        measurements: measurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints,
        pointBindings: pointBindings,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        savedAt: new Date().toISOString(),
      };

      const response = await apiClient.patch(
        `/api/v1/image-files/${numericId}/annotation`,
        { annotation: JSON.stringify(annotationData) }
      );

      if (response.status === 200) {
        setSaveMessage('标注数据保存成功');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存标注数据失败:', error);
      setSaveMessage('保存标注数据失败，请重试');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const saveMeasurements = async () => {
    if (measurements.length === 0) {
      setSaveMessage('暂无测量数据需要保存');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      // 1. 先保存到本地存储
      const key = `annotations_${imageId}`;
      // 对于AI检测标注，需要保存value和description；其他标注只保存type和points
      // 同时保存id，确保加载时绑定数据中的annotationId引用仍然有效
      const simplifiedMeasurements = measurements.map(m => {
        const isAIDetection = m.type.startsWith('AI检测-');
        if (isAIDetection) {
          // AI检测标注：保存id, type, points, value, description
          return {
            id: m.id,
            type: m.type,
            points: m.points,
            value: m.value,
            description: m.description,
          };
        } else {
          // 其他标注：保存id, type和points（value和description可以重新计算）
          return {
            id: m.id,
            type: m.type,
            points: m.points,
          };
        }
      });
      const localData = {
        imageId: imageId,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        measurements: simplifiedMeasurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints,
        pointBindings: pointBindings,
      };
      localStorage.setItem(key, JSON.stringify(localData, null, 2));
      console.log(
        `已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`
      );

      // 2. 保存到服务器
      // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零）
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
      const measurementData = {
        imageId: numericId,
        patientId: imageData.patientId,
        examType: imageData.examType,
        measurements: measurements,
        reportText: reportText,
        savedAt: new Date().toISOString(),
      };

      const response = await apiClient.post(
        `/api/v1/measurements/${numericId}`,
        measurementData
      );

      console.log('保存响应:', response.status);

      if (response.status === 200) {
        setSaveMessage('标注已保存到本地和服务器');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorMsg =
          response.data?.message || response.data?.detail || '保存失败';
        console.error('保存失败:', response.status, errorMsg);
        throw new Error(errorMsg);
      }

      // 3. 同时更新 image-files 的 annotation 字段，持久化绑定数据
      try {
        const annotationData = {
          measurements: measurements,
          standardDistance: standardDistance,
          standardDistancePoints: standardDistancePoints,
          pointBindings: pointBindings,
          imageWidth: imageNaturalSize?.width,
          imageHeight: imageNaturalSize?.height,
          savedAt: new Date().toISOString(),
        };
        await apiClient.patch(`/api/v1/image-files/${numericId}/annotation`, {
          annotation: JSON.stringify(annotationData),
        });
        console.log('绑定数据已同步至 annotation 字段');
      } catch (annotationErr) {
        // 不阻断主保存流程
        console.warn(
          '更新 annotation 字段失败（不影响主保存）:',
          annotationErr
        );
      }
    } catch (error: any) {
      console.error('保存测量数据失败:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        '保存失败，请重试';
      setSaveMessage(`保存失败: ${errorMessage}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
        <StudyHeader
          imageData={imageData}
          saveMessage={saveMessage}
          measurementsLength={measurements.length}
          isSaving={isSaving}
          isAdmin={isAdmin}
          isAIDetecting={isAIDetecting}
          isAIMeasuring={isAIMeasuring}
          onSave={saveMeasurements}
          onExportJson={exportAnnotationsToJSON}
          onImportJson={importAnnotationsFromJSON}
          onAIDetect={handleAIDetection}
          onAIMeasure={handleAIMeasurement}
          onGenerateReport={generateReport}
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
                onMeasurementAdd={addMeasurement}
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
              />
            </div>
          </div>

          <AnnotationToolbar
            examType={imageData.examType}
            tools={tools}
            measurements={measurements}
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
            manualBindingSelectedPointsCount={manualBindingSelectedPoints.length}
            showTagPanel={showTagPanel}
            tags={tags}
            newTag={newTag}
            showAdvicePanel={showAdvicePanel}
            treatmentAdvice={treatmentAdvice}
            onSelectTool={toolId => {
              if ((toolId === 'avt' || toolId === 'ts') && !standardDistance) {
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
                  AVT和TS测量需要先设置标准距离以确保测量准确性。
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    操作步骤：
                  </p>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>点击右侧面板中的"标准距离设置"按钮</li>
                    <li>在图像上标注两个已知距离的点</li>
                    <li>输入实际距离值（单位：mm）</li>
                    <li>确认后即可使用AVT/TS测量工具</li>
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
