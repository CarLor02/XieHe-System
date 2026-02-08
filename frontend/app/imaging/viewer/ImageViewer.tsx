'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createAuthenticatedClient } from '../../../store/authStore';
import { extractData, extractPaginatedData } from '../../../utils/apiResponseHandler';
import {
  CalculationContext,
  getAnnotationConfig,
} from './annotationConfig';
import {
  calculateMeasurementValue as calcMeasurementValue,
  getDescriptionForType as getDesc,
  getToolsForExamType as getTools,
  getColorForType,
  getLabelPositionForType,
  renderSpecialSVGElements,
} from './annotationHelpers';
// 导入工具函数库
import {
  // 常量
  INTERACTION_CONSTANTS,
  TEXT_LABEL_CONSTANTS,

  // 类型
  TransformContext,

  // 几何计算
  calculateDistance,
  pointToLineDistance,
  calculateQuadrilateralCenter,

  // 工具判断（使用 toolUtils 中的实现，支持中文名称）
  isAuxiliaryShape as checkIsAuxiliaryShape,

  // 坐标转换
  imageToScreen as utilImageToScreen,
  screenToImage as utilScreenToImage,

  // 选择检测
  isLineClicked,
  isCircleClicked,
  isEllipseClicked,
  isRectangleClicked,
  isPolygonClicked,

  // 工具判断
  shouldClearToolState,

  // 文字标注
  estimateTextWidth,
  estimateTextHeight,
} from './utils';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

interface StudyData {
  id: number;
  study_id: string;
  patient_id: number;
  patient_name: string;
  study_date: string;
  study_description: string;
  modality: string;
  status: string;
  created_at: string;
}

interface Measurement {
  id: string;
  type: string;
  value: string;
  points: any[];
  description?: string;  // 对于辅助图形，用于存储用户自定义的文字标注
}

interface Point {
  x: number;
  y: number;
}

interface ImageViewerProps {
  imageId: string;
}

export default function ImageViewer({ imageId }: ImageViewerProps) {
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedTool, setSelectedTool] = useState('hand');
  const [reportText, setReportText] = useState('');
  const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 包装工具切换函数，在切换辅助工具时先清理状态
  const handleToolChange = (newTool: string) => {
    // 使用工具函数判断是否需要清理状态
    if (shouldClearToolState(selectedTool, newTool)) {
      // 如果需要清理状态，先清理 clickedPoints
      setClickedPoints([]);
    }

    // 切换工具
    setSelectedTool(newTool);
  };
  const [isMeasurementsLoading, setIsMeasurementsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);

  // 标准距离设置
  const [standardDistance, setStandardDistance] = useState<number | null>(null);
  const [standardDistanceValue, setStandardDistanceValue] = useState('');
  const [isSettingStandardDistance, setIsSettingStandardDistance] = useState(false);
  const [standardDistancePoints, setStandardDistancePoints] = useState<Point[]>([]);
  const [showStandardDistanceWarning, setShowStandardDistanceWarning] = useState(false);
  const [hoveredStandardPointIndex, setHoveredStandardPointIndex] = useState<number | null>(null);
  const [draggingStandardPointIndex, setDraggingStandardPointIndex] = useState<number | null>(null);

  // AI检测
  const [isAIDetecting, setIsAIDetecting] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // 标签系统
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagPanel, setShowTagPanel] = useState(false);

  // 治疗建议
  const [treatmentAdvice, setTreatmentAdvice] = useState('');
  const [showAdvicePanel, setShowAdvicePanel] = useState(false);

  // 锁定图像平移
  const [isImagePanLocked, setIsImagePanLocked] = useState(false);

  // 从API获取真实的影像数据
  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setStudyLoading(true);
        // 直接使用imageId作为image_files表的ID
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/image-files/${numericId}`);

        // 使用 extractData 提取影像文件数据
        const imageFile = extractData<any>(response);

        // 将ImageFile数据转换为StudyData格式
        setStudyData({
          id: imageFile.id,
          study_id: imageFile.file_uuid,
          patient_id: imageFile.patient_id || 0,
          patient_name: imageFile.uploader_name || '未知用户',
          study_date: imageFile.study_date || imageFile.created_at,
          study_description: imageFile.description || imageFile.file_type,
          modality: imageFile.modality || 'OTHER',
          status: imageFile.status,
          created_at: imageFile.created_at,
        });
        
        // 加载标注数据
        if (imageFile.annotation) {
          try {
            const annotationData = JSON.parse(imageFile.annotation);
            if (annotationData.measurements && Array.isArray(annotationData.measurements)) {
              setMeasurements(annotationData.measurements);
              console.log(`从数据库加载了 ${annotationData.measurements.length} 个标注`);
            }
            if (annotationData.standardDistance) {
              setStandardDistance(annotationData.standardDistance);
            }
            if (annotationData.standardDistancePoints) {
              setStandardDistancePoints(annotationData.standardDistancePoints);
            }
          } catch (e) {
            console.error('解析标注数据失败:', e);
          }
        }
      } catch (error) {
        console.error('获取影像数据失败:', error);
        // 如果API失败，使用默认数据
        setStudyData({
          id: parseInt(imageId.replace('IMG', '').replace(/^0+/, '') || '0'),
          study_id: imageId,
          patient_id: 0,
          patient_name: '未知患者',
          study_date: new Date().toISOString().split('T')[0],
          study_description: '未知检查',
          modality: 'XR',
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
        });
      } finally {
        setStudyLoading(false);
      }
    };

    fetchStudyData();
  }, [imageId]);

  // 当图像尺寸确定后，自动加载标注数据
  useEffect(() => {
    if (imageNaturalSize) {
      console.log('图像尺寸已确定，加载标注数据:', imageNaturalSize);
      loadAnnotationsFromLocalStorage();
    }
  }, [imageNaturalSize, imageId]);

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

  // 获取计算上下文（用于标注计算）
  const getCalculationContext = (): CalculationContext => ({
    standardDistance,
    standardDistancePoints,
    imageNaturalSize
  });

  // 根据测量类型和点位计算测量值
  const calculateMeasurementValue = (type: string, points: Point[]): string => {
    return calcMeasurementValue(type, points, getCalculationContext());
  };

  // 根据测量类型获取描述
  const getDescriptionForType = (type: string): string => {
    return getDesc(type);
  };

  // 重新计算所有AVT和TS测量值的函数
  const recalculateAVTandTS = (newStandardDistance?: number, newStandardDistancePoints?: Point[]) => {
    // 使用传入的参数或当前状态值
    const distanceToUse = newStandardDistance !== undefined ? newStandardDistance : standardDistance;
    const pointsToUse = newStandardDistancePoints !== undefined ? newStandardDistancePoints : standardDistancePoints;
    
    const updatedMeasurements = measurements.map((measurement) => {
      // 处理所有依赖标准距离的测量类型：AVT, TS, SVA
      if ((measurement.type === 'AVT' || measurement.type === 'TS' || measurement.type === 'SVA') 
          && measurement.points.length >= 2) {
        const imageWidth = 1000;
        const referenceWidth = 300;
        
        // 计算水平像素距离
        const pixelDistance = Math.abs(measurement.points[1].x - measurement.points[0].x);
        
        // 根据是否有标准距离来计算实际距离
        let distance: number;
        if (distanceToUse && pointsToUse && pointsToUse.length === 2) {
          const standardPixelDx = pointsToUse[1].x - pointsToUse[0].x;
          const standardPixelDy = pointsToUse[1].y - pointsToUse[0].y;
          const standardPixelLength = Math.sqrt(standardPixelDx * standardPixelDx + standardPixelDy * standardPixelDy);
          distance = (pixelDistance / standardPixelLength) * distanceToUse;
        } else {
          // 如果没有标准距离，使用默认比例
          distance = (pixelDistance / imageWidth) * referenceWidth;
        }
        
        const newValue = `${distance.toFixed(1)}mm`;
        return { ...measurement, value: newValue };
      }
      return measurement;
    });
    
    setMeasurements(updatedMeasurements);
  };

  const addMeasurement = (type: string, points: Point[] = []) => {
    // 如果是Cobb工具，自动编号
    let finalType = type;
    if (type === 'cobb') {
      const cobbCount = measurements.filter(m => m.type.startsWith('Cobb')).length;
      finalType = `Cobb${cobbCount + 1}`;
    }

    // 使用统一的配置系统计算测量值
    const defaultValue = calcMeasurementValue(type === 'cobb' ? 'cobb' : finalType, points, {
      standardDistance,
      standardDistancePoints,
      imageNaturalSize,
    }) || '0.0°';
    const description = type === 'cobb' ? 'Cobb角测量' : getDesc(finalType);

    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      type: finalType,  // 使用编号后的类型（Cobb1, Cobb2, Cobb3...）
      value: defaultValue,
      points: points,
      description,
    };

    setMeasurements(prev => [...prev, newMeasurement]);
  };



  // 清空所有测量数据
  const clearAllMeasurements = () => {
    setMeasurements([]);
    setClickedPoints([]);
  };

  // 影像导航功能 - 从API动态获取影像列表
  const [imageList, setImageList] = useState<string[]>([]);

  useEffect(() => {
    const fetchImageList = async () => {
      try {
        const client = createAuthenticatedClient();
        const response = await client.get(
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
      const client = createAuthenticatedClient();
      const response = await client.post('/api/v1/report-generation/generate', {
        imageId: imageId,
        examType: imageData.examType,
        measurements: measurements.map(m => ({
          type: m.type,
          value: m.value,
          description: m.description
        }))
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
        const cobbMeasurement = measurements.find(m => m.type === 'Cobb');
        const caMeasurement = measurements.find(m => m.type === 'CA');

        if (cobbMeasurement) {
          const cobbValue = parseFloat(cobbMeasurement.value);
          if (cobbValue > 10) {
            report += `• 脊柱侧弯程度：${cobbValue < 25 ? '轻度' : cobbValue < 40 ? '中度' : '重度'}（Cobb角 ${cobbMeasurement.value}）\n`;
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

  // 加载测量数据 - 异步加载，不阻止图像显示
  useEffect(() => {
    loadMeasurements();
    loadAnnotationsFromLocalStorage(); // 自动加载本地标注数据
  }, [imageId]);

  const loadMeasurements = async () => {
    setIsMeasurementsLoading(true);
    try {
      const client = createAuthenticatedClient();
      // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零），与保存时保持一致
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
      const response = await client.get(`/api/v1/measurements/${numericId}`);
      if (response.status === 200) {
        // 使用 extractData 提取测量数据
        const data = extractData<any>(response);
        if (data.measurements && data.measurements.length > 0) {
          setMeasurements(data.measurements);
          if (data.reportText) {
            setReportText(data.reportText);
          }
        }
      }
    } catch (error) {
      console.log('加载测量数据失败:', error);
      // 如果加载失败，使用默认空数据
    } finally {
      setIsMeasurementsLoading(false);
    }
  };

  // 从localStorage加载标注数据
  const loadAnnotationsFromLocalStorage = () => {
    try {
      const key = `annotations_${imageId}`;
      const jsonStr = localStorage.getItem(key);
      if (jsonStr) {
        const data = JSON.parse(jsonStr);

        // 先加载或设置标准距离（必须在加载measurements之前）
        let loadedStandardDistance = standardDistance;
        let loadedStandardDistancePoints = standardDistancePoints;

        if (data.standardDistance && data.standardDistancePoints && data.standardDistancePoints.length === 2) {
          // 如果有保存的标准距离，加载它
          const scaledStandardPoints = data.standardDistancePoints.map((p: any) => ({
            x: p.x * (imageNaturalSize ? imageNaturalSize.width / (data.imageWidth || imageNaturalSize.width) : 1),
            y: p.y * (imageNaturalSize ? imageNaturalSize.height / (data.imageHeight || imageNaturalSize.height) : 1)
          }));
          loadedStandardDistance = data.standardDistance;
          loadedStandardDistancePoints = scaledStandardPoints;
          setStandardDistance(data.standardDistance);
          setStandardDistancePoints(scaledStandardPoints);
          console.log(`已加载标准距离: ${data.standardDistance}mm`);
        } else if (imageNaturalSize) {
          // 如果没有保存的标准距离，设置默认值：左上角(0,0)到(200,0)，标准距离100mm
          const defaultPoints = [
            { x: 0, y: 0 },
            { x: 200, y: 0 }
          ];
          loadedStandardDistance = 100;
          loadedStandardDistancePoints = defaultPoints;
          setStandardDistance(100);
          setStandardDistancePoints(defaultPoints);
          console.log('未找到标准距离，已设置默认值: 100mm，标注点: (0,0)到(200,0)');
        }

        // 然后加载measurements（使用已加载的标准距离）
        if (data.measurements && Array.isArray(data.measurements)) {
          // 检查是否需要坐标转换
          const storedImageWidth = data.imageWidth;
          const storedImageHeight = data.imageHeight;
          let scaleX = 1;
          let scaleY = 1;

          if (storedImageWidth && storedImageHeight && imageNaturalSize) {
            scaleX = imageNaturalSize.width / storedImageWidth;
            scaleY = imageNaturalSize.height / storedImageHeight;
            console.log('从本地加载标注，坐标缩放比例:', {
              storedSize: { width: storedImageWidth, height: storedImageHeight },
              currentSize: imageNaturalSize,
              scale: { scaleX, scaleY }
            });
          }

          // 恢复measurements，重新生成id、value和description
          const restoredMeasurements = data.measurements.map((m: any) => {
            // 转换坐标（如果需要）
            const scaledPoints = m.points.map((p: any) => ({
              x: p.x * scaleX,
              y: p.y * scaleY
            }));

            return {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
              type: m.type,
              value: calcMeasurementValue(m.type, scaledPoints, {
                standardDistance: loadedStandardDistance,
                standardDistancePoints: loadedStandardDistancePoints,
                imageNaturalSize,
              }),
              points: scaledPoints,
              description: getDesc(m.type)
            };
          });
          setMeasurements(restoredMeasurements);
          console.log(`已从本地加载 ${restoredMeasurements.length} 个标注`);
        }
      } else if (imageNaturalSize) {
        // 如果完全没有保存的数据，设置默认标准距离
        const defaultPoints = [
          { x: 0, y: 0 },
          { x: 200, y: 0 }
        ];
        setStandardDistance(100);
        setStandardDistancePoints(defaultPoints);
        console.log('未找到本地数据，已设置默认标准距离: 100mm，标注点: (0,0)到(200,0)');
      }
    } catch (error) {
      console.error('加载本地标注数据失败:', error);
      // 即使加载失败，也设置默认标准距离
      if (imageNaturalSize) {
        const defaultPoints = [
          { x: 0, y: 0 },
          { x: 200, y: 0 }
        ];
        setStandardDistance(100);
        setStandardDistancePoints(defaultPoints);
        console.log('加载失败，已设置默认标准距离: 100mm');
      }
    }
  };

  // 保存标注数据到localStorage和服务器
  const saveAnnotationsToLocalStorage = async () => {
    if (measurements.length === 0) {
      setSaveMessage('暂无测量数据需要保存');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      // 1. 保存到本地存储
      const key = `annotations_${imageId}`;
      // 只保存type和points，移除id、value和description
      const simplifiedMeasurements = measurements.map(m => ({
        type: m.type,
        points: m.points
      }));
      const localData = {
        imageId: imageId,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        measurements: simplifiedMeasurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints
      };
      localStorage.setItem(key, JSON.stringify(localData, null, 2));
      console.log(`已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`);

      // 2. 保存到服务器
      const client = createAuthenticatedClient();
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

      const response = await client.post(
        `/api/v1/measurements/${numericId}`,
        measurementData
      );

      console.log('保存响应:', response.status);

      if (response.status === 200) {
        setSaveMessage('标注已保存到本地和服务器');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorMsg = response.data?.message || response.data?.detail || '保存到服务器失败';
        console.error('保存失败:', response.status, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('保存标注数据失败:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || '保存失败，请重试';
      setSaveMessage(`保存失败: ${errorMessage}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 导出标注数据为JSON文件
  const exportAnnotationsToJSON = () => {
    try {
      // 只保存type和points，移除id、value和description
      const simplifiedMeasurements = measurements.map(m => ({
        type: m.type,
        points: m.points
      }));
      
      // 添加图像尺寸信息、标准距离和标准距离标注点，确保坐标系一致性
      const data = {
        imageId: imageId,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        measurements: simplifiedMeasurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints
      };
      console.log('导出标注数据，图像尺寸:', {
        width: imageNaturalSize?.width,
        height: imageNaturalSize?.height,
        standardDistance: standardDistance
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
  const importAnnotationsFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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
            importedSize: { width: importedImageWidth, height: importedImageHeight },
            currentSize: imageNaturalSize,
            scale: { scaleX, scaleY }
          });
        }

        // 导入标注数据，重新生成id、value和description
        const restoredMeasurements = data.measurements.map((m: any) => {
          // 转换坐标（如果需要）
          const scaledPoints = m.points.map((p: any) => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          }));
          
          // 根据type和points重新计算value
          const value = calculateMeasurementValue(m.type, scaledPoints);
          return {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
            type: m.type,
            value: value,
            points: scaledPoints,
            description: getDescriptionForType(m.type)
          };
        });
        
        setMeasurements(restoredMeasurements);
        
        // 导入或设置默认标准距离
        if (data.standardDistance && data.standardDistancePoints && data.standardDistancePoints.length === 2) {
          // 如果有导入的标准距离，使用它
          const scaledStandardPoints = data.standardDistancePoints.map((p: any) => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          }));
          setStandardDistance(data.standardDistance);
          setStandardDistancePoints(scaledStandardPoints);
          setSaveMessage(`已导入 ${restoredMeasurements.length} 个标注和标准距离 ${data.standardDistance}mm`);
          console.log(`已导入标准距离: ${data.standardDistance}mm`);
        } else if (imageNaturalSize) {
          // 如果没有导入的标准距离，设置默认值
          const defaultPoints = [
            { x: 0, y: 0 },
            { x: 200, y: 0 }
          ];
          setStandardDistance(100);
          setStandardDistancePoints(defaultPoints);
          setSaveMessage(`已导入 ${restoredMeasurements.length} 个标注，未找到标准距离，已设置默认值100mm`);
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

  // AI检测函数
  const handleAIDetection = async () => {
    setIsAIDetecting(true);
    setSaveMessage('');

    try {
      // 获取图片文件
      const { accessToken } = require('../../../store/authStore').useAuthStore.getState();
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
      
      // 先获取图片
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const imageResponse = await fetch(`${apiUrl}/api/v1/image-files/${numericId}/download`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!imageResponse.ok) {
        throw new Error('获取图片失败');
      }

      const imageBlob = await imageResponse.blob();
      
      // 构建FormData
      const formData = new FormData();
      formData.append('file', imageBlob, 'image.png');
      formData.append('image_id', imageId);

      // 根据examType选择不同的AI检测接口
      let aiDetectUrl: string;
      if (imageData.examType === '侧位X光片') {
        // 侧位使用专用检测接口
        aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_URL || 'http://115.190.121.59:8002/api/detect_and_keypoints';
      } else {
       // 正位或其他类型使用默认接口
        aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_URL || 'http://localhost:8001/predict';
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

      // 解析AI返回的JSON数据并加载到标注界面
      if (aiData.measurements && Array.isArray(aiData.measurements)) {
        const aiImageWidth = aiData.imageWidth || aiData.image_width;
        const aiImageHeight = aiData.imageHeight || aiData.image_height;
        
        // 尝试从DOM获取实际图像尺寸
        let actualImageSize = imageNaturalSize;
        if (!actualImageSize) {
          // 如果state中没有，尝试直接从DOM获取
          const imgElement = document.querySelector('[data-image-canvas] img') as HTMLImageElement;
          if (imgElement && imgElement.naturalWidth > 0) {
            actualImageSize = {
              width: imgElement.naturalWidth,
              height: imgElement.naturalHeight
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
        let cobbCount = measurements.filter(m => m.type.startsWith('Cobb')).length;

        const aiMeasurements = aiData.measurements
          .filter((m: any) => {
            // 检查标注类型是否存在于配置中
            // 优先匹配 name（精确匹配），然后匹配 id（小写匹配），最后匹配 name（不区分大小写）
            const tool = tools.find((t: any) =>
              t.name === m.type ||
              t.id === m.type.toLowerCase() ||
              t.name.toLowerCase() === m.type.toLowerCase() ||
              // 特殊处理：所有Cobb-*类型都匹配到cobb工具
              (m.type.startsWith('Cobb-') && t.id === 'cobb')
            );

            return !!tool;
          })
          .map((m: any) => {
            // 获取该标注类型所需的点数
            const tools = getTools(imageData.examType);
            const tool = tools.find((t: any) =>
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
              y: p.y * scaleY
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
            const value = calculateMeasurementValue(typeForCalculation, scaledPoints);

            return {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
              type: finalType,  // 使用映射后的类型（Cobb1, Cobb2, Cobb3）
              value: value,
              points: scaledPoints,
              description: isCobb ? 'Cobb角测量' : getDescriptionForType(m.type),
              originalType: m.type  // 保留原始类型用于调试
            };
          });

        setMeasurements(aiMeasurements);
        setSaveMessage(`AI检测完成，已加载 ${aiMeasurements.length} 个标注`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('AI检测完成，但未返回有效数据');
        setTimeout(() => setSaveMessage(''), 3000);
      }
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
      const client = createAuthenticatedClient();
      
      const annotationData = {
        measurements: measurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        savedAt: new Date().toISOString(),
      };

      const response = await client.patch(
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
      // 只保存type和points，移除id、value和description
      const simplifiedMeasurements = measurements.map(m => ({
        type: m.type,
        points: m.points
      }));
      const localData = {
        imageId: imageId,
        imageWidth: imageNaturalSize?.width,
        imageHeight: imageNaturalSize?.height,
        measurements: simplifiedMeasurements,
        standardDistance: standardDistance,
        standardDistancePoints: standardDistancePoints
      };
      localStorage.setItem(key, JSON.stringify(localData, null, 2));
      console.log(`已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`);

      // 2. 保存到服务器
      const client = createAuthenticatedClient();
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

      const response = await client.post(
        `/api/v1/measurements/${numericId}`,
        measurementData
      );

      console.log('保存响应:', response.status);

      if (response.status === 200) {
        setSaveMessage('标注已保存到本地和服务器');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorMsg = response.data?.message || response.data?.detail || '保存失败';
        console.error('保存失败:', response.status, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('保存测量数据失败:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || '保存失败，请重试';
      setSaveMessage(`保存失败: ${errorMessage}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="bg-black/60 backdrop-blur-sm border-b border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/imaging"
              className="text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors flex items-center justify-center"
              title="返回影像列表"
            >
              <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
            </Link>
            <div>
              <h1 className="text-white font-semibold">
                {imageData.patientName} - {imageData.examType}
              </h1>
              <p className="text-white/60 text-sm">
                影像ID: {imageData.id} | 患者ID: {imageData.patientId}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 保存状态提示 */}
            {saveMessage && (
              <div className="bg-green-500/80 text-white px-3 py-1 rounded text-sm flex items-center space-x-2">
                <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
                <span>{saveMessage}</span>
              </div>
            )}

            {/* 标注操作按钮组 */}
            <div className="flex items-center space-x-2 border-r border-gray-600 pr-3">
              <button
                onClick={saveMeasurements}
                disabled={measurements.length === 0 || isSaving}
                className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                title="保存标注到数据库"
              >
                <span>{isSaving ? '保存中...' : '保存'}</span>
              </button>

              <button
                onClick={exportAnnotationsToJSON}
                disabled={measurements.length === 0}
                className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                title="导出标注文件"
              >
                <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                <span>导出JSON</span>
              </button>

              <label
                className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap cursor-pointer flex items-center space-x-2"
                title="导入标注文件"
              >
                <i className="ri-upload-line w-4 h-4 flex items-center justify-center"></i>
                <span>导入JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importAnnotationsFromJSON}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={handleAIDetection}
              disabled={isAIDetecting}
              className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="使用AI自动检测标注"
            >
              {isAIDetecting ? (
                <>
                  <i className="ri-loader-line w-4 h-4 flex items-center justify-center animate-spin"></i>
                  <span>检测中...</span>
                </>
              ) : (
                <>
                  <i className="ri-braces-line w-4 h-4 flex items-center justify-center"></i>
                  <span>AI检测</span>
                </>
              )}
            </button>

            <button
              onClick={generateReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
            >
              生成报告
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 中间影像查看区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black flex items-center justify-center relative flex-1 overflow-hidden">
            {/* 直接显示ImageCanvas，让它自己处理图像加载状态 */}
            <ImageCanvas
              selectedImage={imageData}
              measurements={measurements}
              selectedTool={selectedTool}
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
              recalculateAVTandTS={recalculateAVTandTS}
              onImageSizeChange={(size) => setImageNaturalSize(size)}
              onToolChange={handleToolChange}
              isImagePanLocked={isImagePanLocked}
            />
          </div>
        </div>

        {/* 右侧工具栏 */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
          {/* 工具选择区 */}
          <div className="bg-gray-800 px-4 py-3 flex-1 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-white mb-3 flex-shrink-0">
              测量工具 - {imageData.examType}
            </h3>

            {/* 工具和设置区域 - 可滚动 */}
            <div className="flex-shrink-0 overflow-y-auto mb-4">
              {/* 基础移动模式 */}
              <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                <i className="ri-hand-line w-3 h-3 mr-1"></i>
                基础模式
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTool('hand');
                    // 切换工具时退出标准距离设置模式
                    if (isSettingStandardDistance) {
                      setIsSettingStandardDistance(false);
                      setStandardDistancePoints([]);
                    }
                  }}
                  className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                    selectedTool === 'hand'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="移动、选择、删除工具"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div
                    className="flex flex-col text-center"
                    style={{
                      transform: 'translateY(0)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      display: 'flex'
                    }}
                  >
                    <i className="ri-hand-line text-lg mb-1" style={{ lineHeight: '1' }}></i>
                    <span className="text-xs" style={{ lineHeight: '1' }}>移动</span>
                  </div>
                  {selectedTool === 'hand' && (
                    <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -right-1 bg-blue-500 rounded-full"></i>
                  )}
                </button>
              </div>

              {/* 锁定图像平移按钮 */}
              <div className="mt-2">
                <button
                  onClick={() => {
                    setIsImagePanLocked(!isImagePanLocked);
                  }}
                  className={`rounded-lg w-full h-10 transition-all relative flex items-center justify-center gap-2 ${
                    isImagePanLocked
                      ? 'bg-yellow-600 text-white ring-2 ring-yellow-400 shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={isImagePanLocked ? "图像已锁定，点击解锁" : "锁定图像平移，防止拖拽时移动图像"}
                >
                  <i className={isImagePanLocked ? "ri-lock-line text-base" : "ri-lock-unlock-line text-base"}></i>
                  <span className="text-xs">{isImagePanLocked ? "已锁定" : "锁定图像"}</span>
                  {isImagePanLocked && (
                    <i className="ri-check-line w-3 h-3 flex items-center justify-center text-yellow-200 absolute -top-1 -right-1 bg-yellow-500 rounded-full"></i>
                  )}
                </button>
              </div>
            </div>

            {/* 专业测量工具 */}
            {(() => {
              const measurementTools = tools.filter(tool => tool.pointsNeeded > 0);
              if (measurementTools.length === 0) return null;
              
              return (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                    <i className="ri-ruler-line w-3 h-3 mr-1"></i>
                    测量标注
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {measurementTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          // 检查AVT和TS工具是否需要标准距离
                          if ((tool.id === 'avt' || tool.id === 'ts') && !standardDistance) {
                            setShowStandardDistanceWarning(true);
                            setSelectedTool('hand');
                            return;
                          }
                          
                          setSelectedTool(tool.id);
                          // 切换工具时退出标准距离设置模式
                          if (isSettingStandardDistance) {
                            setIsSettingStandardDistance(false);
                            setStandardDistancePoints([]);
                          }
                        }}
                        className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                          selectedTool === tool.id
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title={`${tool.description} (需要标注${tool.pointsNeeded}个点)`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <div 
                          className="flex flex-col text-center" 
                          style={{ 
                            transform: 'translateY(0)', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: '100%',
                            display: 'flex'
                          }}
                        >
                          <i
                            className={`${tool.icon} text-lg mb-1`}
                            style={{ lineHeight: '1' }}
                          ></i>
                          <span className="text-xs text-center" style={{ lineHeight: '1' }}>
                            {tool.name}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {tool.pointsNeeded}
                        </div>
                        {selectedTool === tool.id && (
                          <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -left-1 bg-blue-500 rounded-full"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 辅助图形工具 */}
            {(() => {
              const auxiliaryTools = tools.filter(tool => tool.pointsNeeded === 0);
              if (auxiliaryTools.length === 0) return null;
              
              return (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                    <i className="ri-shape-line w-3 h-3 mr-1"></i>
                    辅助图形
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {auxiliaryTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setSelectedTool(tool.id);
                          // 切换工具时退出标准距离设置模式
                          if (isSettingStandardDistance) {
                            setIsSettingStandardDistance(false);
                            setStandardDistancePoints([]);
                          }
                        }}
                        className={`rounded-lg min-w-[60px] h-12 transition-all relative flex flex-col ${
                          selectedTool === tool.id
                            ? 'bg-green-600 text-white ring-2 ring-green-400 shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title={`${tool.description} (拖拽绘制)`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <div 
                          className="flex flex-col text-center" 
                          style={{ 
                            transform: 'translateY(0)', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: '100%',
                            display: 'flex'
                          }}
                        >
                          <i
                            className={`${tool.icon} text-lg mb-1`}
                            style={{ lineHeight: '1' }}
                          ></i>
                          <span className="text-xs text-center" style={{ lineHeight: '1' }}>
                            {tool.name.replace('Auxiliary ', '').replace('Polygons', '多边形')}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          <i className="ri-mouse-line w-2 h-2"></i>
                        </div>
                        {selectedTool === tool.id && (
                          <i className="ri-check-line w-3 h-3 flex items-center justify-center text-green-200 absolute -top-1 -left-1 bg-green-500 rounded-full"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 标准距离设置按钮 */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setIsSettingStandardDistance(true);
                  setStandardDistancePoints([]);
                  setSelectedTool('hand'); // 切换到手动模式以便点击
                }}
                className={`w-full px-3 py-2 ${
                  isSettingStandardDistance 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors`}
              >
                <i className="ri-ruler-line w-4 h-4"></i>
                <span>{isSettingStandardDistance ? '设置标准距离中...' : '标准距离设置'}</span>
              </button>

              {/* 常驻输入框：设置标准距离 */}
              <div className="mt-2">
                <label className="text-xs text-gray-400 mb-1 block">标准距离值 (mm)</label>
                <input
                  type="number"
                  value={standardDistanceValue}
                  onChange={(e) => setStandardDistanceValue(e.target.value)}
                  onBlur={() => {
                    const value = parseFloat(standardDistanceValue);
                    if (!isNaN(value) && value > 0 && standardDistancePoints.length === 2) {
                      recalculateAVTandTS(value, standardDistancePoints);
                      setStandardDistance(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseFloat(standardDistanceValue);
                      if (!isNaN(value) && value > 0 && standardDistancePoints.length === 2) {
                        recalculateAVTandTS(value, standardDistancePoints);
                        setStandardDistance(value);
                        setIsSettingStandardDistance(false);
                      }
                    }
                  }}
                  placeholder="例如: 100"
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 text-white text-sm rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                {standardDistance !== null && standardDistancePoints.length === 2 && (
                  <div className="mt-1.5 text-xs text-green-400">
                    ✓ 已设置: {standardDistance}mm
                  </div>
                )}
              </div>
            </div>

            {/* 标签系统按钮 */}
            <div className="mb-4">
              <button
                onClick={() => setShowTagPanel(!showTagPanel)}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <i className="ri-price-tag-line w-4 h-4"></i>
                <span>标签管理</span>
              </button>

              {/* 标签管理面板 */}
              {showTagPanel && (
                <div className="mt-2 bg-gray-700/50 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="输入标签"
                        className="flex-1 px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-green-400 focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newTag.trim()) {
                            setTags([...tags, newTag.trim()]);
                            setNewTag('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newTag.trim()) {
                            setTags([...tags, newTag.trim()]);
                            setNewTag('');
                          }
                        }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        添加
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, idx) => (
                          <div
                            key={idx}
                            className="bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() =>
                                setTags(tags.filter((_, i) => i !== idx))
                              }
                              className="hover:text-red-300"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 治疗建议按钮 */}
            <div className="mb-4">
              <button
                onClick={() => setShowAdvicePanel(!showAdvicePanel)}
                className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <i className="ri-file-text-line w-4 h-4"></i>
                <span>治疗建议</span>
              </button>

              {/* 治疗建议面板 */}
              {showAdvicePanel && (
                <div className="mt-2 bg-gray-700/50 rounded-lg p-3">
                  <textarea
                    value={treatmentAdvice}
                    onChange={e => setTreatmentAdvice(e.target.value)}
                    placeholder="输入医生的治疗建议..."
                    className="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-orange-400 focus:outline-none resize-none"
                    rows={3}
                  />
                  {treatmentAdvice && (
                    <div className="text-xs text-orange-400 mt-2">
                      ✓ 已输入 {treatmentAdvice.length} 个字符
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 报告展示区域 */}
            {reportText && (
              <div className="mb-4">
                <div className="bg-gray-700/50 rounded-lg p-3 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white flex items-center">
                      <i className="ri-file-text-line w-4 h-4 mr-1"></i>
                      分析报告
                    </h4>
                    <button
                      onClick={() => {
                        // 复制报告到剪贴板（Markdown格式）
                        navigator.clipboard.writeText(reportText);
                        setSaveMessage('报告已复制到剪贴板');
                        setTimeout(() => setSaveMessage(''), 2000);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <i className="ri-file-copy-line w-3 h-3 mr-1"></i>
                      复制
                    </button>
                  </div>
                  {/* Markdown渲染区域 */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {reportText}
                    </div>
                    {/* TODO: 安装 react-markdown 和 remark-gfm 包后启用 Markdown 渲染 */}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 标准距离未设置警告对话框 */}
    {showStandardDistanceWarning && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <i className="ri-alert-line text-2xl text-yellow-600"></i>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">请先设置标准距离</h3>
              <p className="text-sm text-gray-600 mb-3">
                AVT和TS测量需要先设置标准距离以确保测量准确性。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-blue-900 mb-2">操作步骤：</p>
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

// 可交互影像画布组件
function ImageCanvas({
  selectedImage,
  measurements,
  selectedTool,
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
}: {
  selectedImage: any;
  measurements: Measurement[];
  selectedTool: string;
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
}) {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showResults, setShowResults] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

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

  // 参考线状态管理（优化：合并为一个对象状态）
  const [referenceLines, setReferenceLines] = useState<{
    t1Tilt: Point | null;      // T1 tilt 水平参考线
    ca: Point | null;          // CA 水平参考线
    pelvic: Point | null;      // Pelvic 水平参考线
    sacral: Point | null;      // Sacral 水平参考线
    avt: Point | null;         // AVT 第一条垂直线
    ts: Point | null;          // TS 第一条垂直线
    ss: Point | null;          // SS（骶骨倾斜角）水平参考线
    sva: Point | null;         // SVA（矢状面垂直轴）第一条垂直线
  }>({
    t1Tilt: null,
    ca: null,
    pelvic: null,
    sacral: null,
    avt: null,
    ts: null,
    ss: null,
    sva: null,
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
  const [hiddenMeasurementIds, setHiddenMeasurementIds] = useState<Set<string>>(new Set());
  const [hideAllLabels, setHideAllLabels] = useState(false);
  
  // 隐藏整个标注状态 - 用于控制整个标注（图形+标识）的显示/隐藏
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(new Set());
  const [hideAllAnnotations, setHideAllAnnotations] = useState(false);
  
  // 标准距离可见性状态
  const [isStandardDistanceHidden, setIsStandardDistanceHidden] = useState(false);

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
          require('../../../store/authStore').useAuthStore.getState();

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/image-files/${numericId}/download`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

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
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [imageId]);

  const pointsNeeded = currentTool?.pointsNeeded || 2;

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
    // 🔒 安全检查：图像未加载完成时，禁止所有交互操作
    if (!imageNaturalSize) {
      console.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    if (selectedTool === 'hand' && e.button === 0 && standardDistancePoints.length === 2) {
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
          // 对于圆形和椭圆标注，跳过端点选择
          if (!isAuxiliaryShape || (measurement.type !== '圆形标注' && measurement.type !== '椭圆标注')) {
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
          }
          
          // 1.2 如果没有点击到点，检查是否点击了文字标识区域或辅助图形内部区域
          if (!foundSelection) {
            
            if (isAuxiliaryShape) {
              // 辅助图形:检查是否点击了图形边界线条（使用屏幕坐标）
              
              if (measurement.type === '圆形标注' && measurement.points.length === 2) {
                // 圆形:检查是否点击了圆边界 - 使用工具函数
                const context = getTransformContext();
                if (isCircleClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '椭圆标注' && measurement.points.length === 2) {
                // 椭圆:检查是否点击了椭圆边界 - 使用工具函数
                const context = getTransformContext();
                if (isEllipseClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '矩形标注' && measurement.points.length === 2) {
                // 矩形:检查是否点击了矩形边界 - 使用工具函数
                const context = getTransformContext();
                if (isRectangleClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '多边形标注' && measurement.points.length >= 3) {
                // 多边形:检查是否点击了任意一条边 - 使用工具函数
                const context = getTransformContext();
                if (isPolygonClicked(screenPoint, measurement.points, context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '箭头标注' && measurement.points.length >= 2) {
                // 箭头:检查是否点击了箭头线段 - 使用工具函数
                const context = getTransformContext();
                if (isLineClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '锥体中心' && measurement.points.length === 4) {
                // 锥体中心:检查是否点击了四边形的任意一条边或中心点
                const context = getTransformContext();
                // 检查四边形边缘
                if (isPolygonClicked(screenPoint, measurement.points, context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                } else {
                  // 检查中心点
                  const center = calculateQuadrilateralCenter(measurement.points);
                  const centerScreen = imageToScreen(center);
                  const distToCenter = calculateDistance(screenPoint, centerScreen);
                  if (distToCenter < 15) { // 中心点点击范围稍大一些
                    selectedMeasurement = measurement;
                    selType = 'whole';
                    foundSelection = true;
                  }
                }
              } else if (measurement.type === '距离标注' && measurement.points.length === 2) {
                // 距离标注:检查是否点击了线段
                const context = getTransformContext();
                if (isLineClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '角度标注' && measurement.points.length === 3) {
                // 角度标注:检查是否点击了两条线段
                const context = getTransformContext();
                if (isLineClicked(screenPoint, measurement.points[0], measurement.points[1], context, lineClickRadius) ||
                    isLineClicked(screenPoint, measurement.points[1], measurement.points[2], context, lineClickRadius)) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              }
            } else {
              // 非辅助图形:检查文字标识区域（使用屏幕坐标）
              // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标，然后转换为屏幕坐标
              const labelPosInImage = getLabelPositionForType(measurement.type, measurement.points, imageScale);
              const labelPosInScreen = imageToScreen(labelPosInImage);
              const textBaselineX = labelPosInScreen.x;
              const textBaselineY = labelPosInScreen.y;
              
              const textContent = `${measurement.type}: ${measurement.value}`;
              // 使用工具函数估算文字尺寸
              const textWidth = estimateTextWidth(textContent, TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE);
              const textHeight = estimateTextHeight(TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE);
              const textTop = textBaselineY - textHeight / 2;
              const textBottom = textBaselineY + textHeight / 2;
              
              if (screenPoint.x >= textBaselineX - textWidth / 2 && screenPoint.x <= textBaselineX + textWidth / 2 &&
                  screenPoint.y >= textTop && screenPoint.y <= textBottom) {
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
              Math.pow(screenPoint.x - pointScreen.x, 2) + Math.pow(screenPoint.y - pointScreen.y, 2)
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
          const measurement = measurements.find(m => m.id === selectionState.measurementId);
          if (measurement && measurement.points.length > 0) {
            // 如果是点级别选择，只允许在选中点的选中框内拖拽
            if (selectionState.type === 'point' && selectionState.pointIndex !== null) {
              const selectedPoint = measurement.points[selectionState.pointIndex];
              
              // 计算选中框范围（与绘制逻辑一致）
              const screenPoint = imageToScreen(selectedPoint);
              const selectionBoxMinX = screenPoint.x - 15;
              const selectionBoxMaxX = screenPoint.x + 15;
              const selectionBoxMinY = screenPoint.y - 15;
              const selectionBoxMaxY = screenPoint.y + 15;
              
              // 将当前鼠标位置转换为屏幕坐标
              const mouseScreenPoint = imageToScreen(imagePoint);
              
              // 检查是否在选中框内
              if (mouseScreenPoint.x >= selectionBoxMinX && mouseScreenPoint.x <= selectionBoxMaxX &&
                  mouseScreenPoint.y >= selectionBoxMinY && mouseScreenPoint.y <= selectionBoxMaxY) {
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
              if (measurement.type === '圆形标注' && measurement.points.length >= 2) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const screenCenter = imageToScreen(center);
                const screenEdge = imageToScreen(edge);
                const screenRadius = Math.sqrt(
                  Math.pow(screenEdge.x - screenCenter.x, 2) + Math.pow(screenEdge.y - screenCenter.y, 2)
                );
                selectionBoxMinX = screenCenter.x - screenRadius - 15;
                selectionBoxMaxX = screenCenter.x + screenRadius + 15;
                selectionBoxMinY = screenCenter.y - screenRadius - 15;
                selectionBoxMaxY = screenCenter.y + screenRadius + 15;
              } else if (measurement.type === '椭圆标注' && measurement.points.length >= 2) {
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
                const screenPoints = measurement.points.map(p => imageToScreen(p));
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
              if (mouseScreenPoint.x >= selectionBoxMinX && mouseScreenPoint.x <= selectionBoxMaxX &&
                  mouseScreenPoint.y >= selectionBoxMinY && mouseScreenPoint.y <= selectionBoxMaxY) {
                // 在选中框内,重新计算到中心的偏移（优化：更新dragOffset）
                const centerX = (Math.min(...measurement.points.map(p => p.x)) + Math.max(...measurement.points.map(p => p.x))) / 2;
                const centerY = (Math.min(...measurement.points.map(p => p.y)) + Math.max(...measurement.points.map(p => p.y))) / 2;
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
            Math.pow(imagePoint.x - firstPoint.x, 2) + Math.pow(imagePoint.y - firstPoint.y, 2)
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
        // 角度标注绘制模式 - 点击3个点
        const imagePoint = screenToImage(x, y);

        const newPoints = [...clickedPoints, imagePoint];
        setClickedPoints(newPoints);

        // 如果已经点击了3个点，自动完成
        if (newPoints.length === 3) {
          onMeasurementAdd('角度标注', newPoints);
          setClickedPoints([]);
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
            Math.pow(imagePoint.x - point.x, 2) + Math.pow(imagePoint.y - point.y, 2)
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
          const newPoints = [...clickedPoints, imagePoint];
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
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setReferenceLines(prev => ({ ...prev, ss: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, ss: null })); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('sva')) {
            // SVA（矢状面垂直轴）特殊处理（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setReferenceLines(prev => ({ ...prev, sva: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, sva: null })); // 清除第一条垂直线
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
            // TS 特殊处理 - 两条垂直线的距离测量（优化：使用referenceLines）
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setReferenceLines(prev => ({ ...prev, ts: imagePoint }));
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setReferenceLines(prev => ({ ...prev, ts: null })); // 清除第一条垂直线
              }
            }
          } else {
            // 其他工具的原有逻辑
            const currentTool = tools.find(t => t.id === selectedTool);
            if (currentTool && newPoints.length === currentTool.pointsNeeded) {
              onMeasurementAdd(currentTool.name, newPoints);
              const emptyPoints: Point[] = [];
              setClickedPoints(emptyPoints);
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
    if ((selectionState.measurementId || selectionState.pointIndex !== null) && selectedTool === 'hand' && e.buttons === 1) {
      const imagePoint = screenToImage(x, y);

      // 如果还没开始拖拽,检查鼠标是否在边界框内
      if (!selectionState.isDragging) {
        let canDrag = false;

        if (selectionState.measurementId) {
          const measurement = measurements.find(m => m.id === selectionState.measurementId);
          if (measurement && measurement.points.length > 0) {
            // 使用与蓝色选中框相同的边界框计算逻辑
            let minX: number, maxX: number, minY: number, maxY: number;

            // 针对不同类型的图形计算不同的边界框（与选中框渲染逻辑一致）
            if (selectionState.type === 'whole') {
              // 辅助图形需要特殊处理
              if (measurement.type === '圆形标注' && measurement.points.length >= 2) {
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const radius = Math.sqrt(
                  Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
                );
                const screenCenter = imageToScreen(center);
                const screenRadius = radius * imageScale;
                
                minX = screenCenter.x - screenRadius - 15;
                maxX = screenCenter.x + screenRadius + 15;
                minY = screenCenter.y - screenRadius - 15;
                maxY = screenCenter.y + screenRadius + 15;
              } else if (measurement.type === '椭圆标注' && measurement.points.length >= 2) {
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
              } else if (measurement.type === '矩形标注' && measurement.points.length >= 2) {
                const start = measurement.points[0];
                const end = measurement.points[1];
                const startScreen = imageToScreen(start);
                const endScreen = imageToScreen(end);
                
                minX = Math.min(startScreen.x, endScreen.x) - 15;
                maxX = Math.max(startScreen.x, endScreen.x) + 15;
                minY = Math.min(startScreen.y, endScreen.y) - 15;
                maxY = Math.max(startScreen.y, endScreen.y) + 15;
              } else if (measurement.type === '箭头标注' && measurement.points.length >= 2) {
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
                const screenPoints = measurement.points.map(p => imageToScreen(p));
                const xs = screenPoints.map(p => p.x);
                const ys = screenPoints.map(p => p.y);
                minX = Math.min(...xs) - 15;
                maxX = Math.max(...xs) + 15;
                minY = Math.min(...ys) - 15;
                maxY = Math.max(...ys) + 15;
              }
            } else {
              // 点选择模式：基于标注点位置
              const screenPoints = measurement.points.map(p => imageToScreen(p));
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
            if (mouseScreenPoint.x >= minX && mouseScreenPoint.x <= maxX &&
                mouseScreenPoint.y >= minY && mouseScreenPoint.y <= maxY) {
              canDrag = true;
            }
          }
        } else if (selectionState.pointIndex !== null && clickedPoints[selectionState.pointIndex]) {
          // 对于单个点,始终允许拖拽
          canDrag = true;
        }

        if (canDrag) {
          setSelectionState({ ...selectionState, isDragging: true });
        }
        // 如果不能拖拽,不执行任何操作,让其他鼠标处理逻辑处理
      }
      
      // 如果已经在拖拽状态,继续拖拽(无论鼠标是否在边界框内)（优化：使用selectionState）
      if (selectionState.isDragging || selectionState.measurementId || selectionState.pointIndex !== null) {
        if (selectionState.measurementId) {
          const measurement = measurements.find(m => m.id === selectionState.measurementId);
          if (measurement && measurement.points.length > 0) {

            if (selectionState.type === 'point' && selectionState.pointIndex !== null) {
              // 移动单个点
              const newPointX = imagePoint.x - selectionState.dragOffset.x;
              const newPointY = imagePoint.y - selectionState.dragOffset.y;

              const updatedMeasurements = measurements.map(m => {
                if (m.id === selectionState.measurementId) {
                  const updatedMeasurement = {
                    ...m,
                    points: m.points.map((p, idx) =>
                      idx === selectionState.pointIndex ? { x: newPointX, y: newPointY } : p
                    ),
                  };
                  // 重新计算测量值
                  updatedMeasurement.value = calcMeasurementValue(m.type, updatedMeasurement.points, {
                    standardDistance,
                    standardDistancePoints,
                    imageNaturalSize
                  }) || updatedMeasurement.value;
                  return updatedMeasurement;
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

              // 更新所有点的位置
              const updatedMeasurements = measurements.map(m => {
                if (m.id === selectionState.measurementId) {
                  const updatedMeasurement = {
                    ...m,
                    points: m.points.map(p => ({
                      x: p.x + deltaX,
                      y: p.y + deltaY,
                    })),
                  };
                  // 重新计算测量值
                  updatedMeasurement.value = calcMeasurementValue(m.type, updatedMeasurement.points, {
                    standardDistance,
                    standardDistancePoints,
                    imageNaturalSize
                  }) || updatedMeasurement.value;
                  return updatedMeasurement;
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
            y: imagePoint.y - selectionState.dragOffset.y
          };
          newPoints[selectionState.pointIndex] = newPoint;
          setClickedPoints(newPoints);

          // T1 Tilt 特殊处理：第一个点移动时，水平参考线跟随移动（优化：使用referenceLines）
          if (selectedTool.includes('t1-tilt') && selectionState.pointIndex === 0 && referenceLines.t1Tilt) {
            setReferenceLines(prev => ({ ...prev, t1Tilt: newPoint }));
          }
        }
      }
    } else if (adjustMode === 'zoom' && isDragging && selectedTool === 'hand' && !isImagePanLocked) {
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
    if (selectedTool === 'hand' && !selectionState.isDragging && !isDragging && !drawingState.isDrawing) {
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
        // 对于圆形和椭圆标注，跳过端点悬浮
        if (!isAuxiliaryShape || (measurement.type !== '圆形标注' && measurement.type !== '椭圆标注')) {
          for (let i = 0; i < measurement.points.length; i++) {
            const point = measurement.points[i];
            const screenPointPos = imageToScreen(point);
            const distance = Math.sqrt(
              Math.pow(screenPoint.x - screenPointPos.x, 2) + Math.pow(screenPoint.y - screenPointPos.y, 2)
            );
            if (distance < pointHoverRadius) {
              hoveredMeasurementId = measurement.id;
              hoveredPointIdx = i;
              hoveredElementType = 'point';
              foundHover = true;
              break;
            }
          }
        }
        
        // 2. 如果没有悬浮在点上，检查是否悬浮在文字标识或辅助图形内部
        if (!foundHover) {
          
          if (isAuxiliaryShape) {
            // 辅助图形：检查是否悬浮在图形边界线条上（使用屏幕坐标检测）
            
            if (measurement.type === '圆形标注' && measurement.points.length === 2) {
              const centerScreen = imageToScreen(measurement.points[0]);
              const edgeScreen = imageToScreen(measurement.points[1]);
              const screenRadius = Math.sqrt(
                Math.pow(edgeScreen.x - centerScreen.x, 2) + Math.pow(edgeScreen.y - centerScreen.y, 2)
              );
              const distToCenter = Math.sqrt(
                Math.pow(screenPoint.x - centerScreen.x, 2) + Math.pow(screenPoint.y - centerScreen.y, 2)
              );
              // 检查是否悬浮在圆边界附近
              if (Math.abs(distToCenter - screenRadius) < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (measurement.type === '椭圆标注' && measurement.points.length === 2) {
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
                if (Math.abs(normalizedDist - 1) < lineHoverRadius / Math.min(radiusX, radiusY)) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                }
              }
            } else if (measurement.type === '矩形标注' && measurement.points.length === 2) {
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
              
              const onLeftOrRight = (distToLeft < lineHoverRadius || distToRight < lineHoverRadius) && 
                                    screenPoint.y >= minY - lineHoverRadius && screenPoint.y <= maxY + lineHoverRadius;
              const onTopOrBottom = (distToTop < lineHoverRadius || distToBottom < lineHoverRadius) && 
                                     screenPoint.x >= minX - lineHoverRadius && screenPoint.x <= maxX + lineHoverRadius;
              
              if (onLeftOrRight || onTopOrBottom) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (measurement.type === '多边形标注' && measurement.points.length >= 3) {
              // 多边形：检查是否悬浮在任意一条边上 - 使用工具函数
              for (let i = 0; i < measurement.points.length; i++) {
                const currentScreen = imageToScreen(measurement.points[i]);
                const nextScreen = imageToScreen(measurement.points[(i + 1) % measurement.points.length]);

                // 使用工具函数计算点到线段的距离
                const distToEdge = pointToLineDistance(screenPoint, currentScreen, nextScreen);

                if (distToEdge < lineHoverRadius) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                  break;
                }
              }
            } else if (measurement.type === '箭头标注' && measurement.points.length >= 2) {
              // 箭头：检查是否悬浮在箭头线段上 - 使用工具函数
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);

              // 使用工具函数计算点到线段的距离
              const distToLine = pointToLineDistance(screenPoint, startScreen, endScreen);

              if (distToLine < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (measurement.type === '锥体中心' && measurement.points.length === 4) {
              // 锥体中心：检查是否悬浮在四边形边缘或中心点
              // 检查四边形边缘
              for (let i = 0; i < measurement.points.length; i++) {
                const currentScreen = imageToScreen(measurement.points[i]);
                const nextScreen = imageToScreen(measurement.points[(i + 1) % measurement.points.length]);

                const distToEdge = pointToLineDistance(screenPoint, currentScreen, nextScreen);

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
                const distToCenter = calculateDistance(screenPoint, centerScreen);
                if (distToCenter < 15) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                }
              }
            } else if (measurement.type === '距离标注' && measurement.points.length === 2) {
              // 距离标注：检查是否悬浮在线段上
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);

              const distToLine = pointToLineDistance(screenPoint, startScreen, endScreen);

              if (distToLine < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            } else if (measurement.type === '角度标注' && measurement.points.length === 3) {
              // 角度标注：检查是否悬浮在两条线段上
              const p0Screen = imageToScreen(measurement.points[0]);
              const p1Screen = imageToScreen(measurement.points[1]);
              const p2Screen = imageToScreen(measurement.points[2]);

              const distToLine1 = pointToLineDistance(screenPoint, p0Screen, p1Screen);
              const distToLine2 = pointToLineDistance(screenPoint, p1Screen, p2Screen);

              if (distToLine1 < lineHoverRadius || distToLine2 < lineHoverRadius) {
                hoveredMeasurementId = measurement.id;
                hoveredElementType = 'whole';
                foundHover = true;
              }
            }
          } else {
            // 非辅助图形：检查文字标识区域（使用屏幕坐标，与渲染位置保持一致）
            const screenPoints = measurement.points.map(p => imageToScreen(p)).filter(p => p !== null && p !== undefined);
            
            // 确保有足够的有效点
            if (screenPoints.length === 0) {
              continue;
            }
            
            // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标，然后转换为屏幕坐标
            const labelPosInImage = getLabelPositionForType(measurement.type, measurement.points, imageScale);
            const labelPosInScreen = imageToScreen(labelPosInImage);
            const textBaselineX = labelPosInScreen.x;
            const textBaselineY = labelPosInScreen.y;
            
            // 文字尺寸估算 - 使用工具函数
            const textContent = `${measurement.type}: ${measurement.value}`;
            const textWidth = estimateTextWidth(textContent, TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE);
            const textHeight = estimateTextHeight(TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE);
            
            // SVG text的y坐标是基线，文字实际在基线上方
            const textTop = textBaselineY - textHeight / 2;
            const textBottom = textBaselineY + textHeight / 2;
            
            if (screenPoint.x >= textBaselineX - textWidth / 2 && screenPoint.x <= textBaselineX + textWidth / 2 &&
                screenPoint.y >= textTop && screenPoint.y <= textBottom) {
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
            Math.pow(screenPoint.x - pointScreen.x, 2) + Math.pow(screenPoint.y - pointScreen.y, 2)
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
          { x: endX, y: endY },     // 边缘点
        ];
        onMeasurementAdd('圆形标注', points);
      } else if (selectedTool === 'ellipse') {
        // 椭圆：存储中心点和边界点
        const points: Point[] = [
          { x: startX, y: startY }, // 中心点
          { x: endX, y: endY },     // 边界点
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
          { x: endX, y: endY },     // 终点
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

      const auxiliaryShapeTypes = ['圆形标注', '椭圆标注', '矩形标注', '箭头标注'];

      if (selectedMeasurement && auxiliaryShapeTypes.includes(selectedMeasurement.type)) {
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
      const auxiliaryShapeTypes = ['圆形标注', '椭圆标注', '矩形标注', '箭头标注'];
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
    const measurement = measurements.find(m => m.id === contextMenu.measurementId);
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
      onMeasurementsUpdate(measurements.filter(m => m.id !== contextMenu.measurementId));
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
      onMeasurementsUpdate(measurements.map(m =>
        m.id === editLabelDialog.measurementId
          ? { ...m, description: editLabelDialog.currentLabel }
          : m
      ));
    }
    setEditLabelDialog({ visible: false, measurementId: null, currentLabel: '' });
  };

  // 文字编辑对话框：取消
  const handleCancelEdit = () => {
    setEditLabelDialog({ visible: false, measurementId: null, currentLabel: '' });
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
      if (isHovering) {
        wheelEvent.preventDefault();
        wheelEvent.stopPropagation();

        // 改进：使用更小的步长，便于精确调整
        const delta = wheelEvent.deltaY > 0 ? 0.95 : 1.05;
        // 使用函数式更新，避免依赖 imageScale
        setImageScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
      }
    };

    // 键盘快捷键处理
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框内，如果是则不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
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
        container.removeEventListener('wheel', handleWheelEvent as EventListener);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovering]);

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
      t1Tilt: (selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) ? null : prev.t1Tilt,
      ss: selectedTool.includes('ss') ? null : prev.ss,
      sva: selectedTool.includes('sva') ? null : prev.sva,
    }));
  };

  const getCursorStyle = () => {
    if (isSettingStandardDistance) return 'cursor-crosshair';
    if (selectedTool === 'hand') return 'cursor-grab active:cursor-grabbing';
    return 'cursor-crosshair';
  };

  return (
    <div
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
      onDragStart={(e) => e.preventDefault()}
      onDrag={(e) => e.preventDefault()}
      onDragEnd={(e) => e.preventDefault()}
    >
      {/* 左上角测量结果展示区 */}
      <div 
        className="absolute top-4 left-48 z-50"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden w-[240px]">
          <div className="flex items-center justify-between px-3 py-2 bg-black/20 w-full">
            <div className="flex items-center min-w-0">
              <button
                onClick={(e) => {
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
                title={hideAllAnnotations ? "显示所有标注" : "隐藏所有标注"}
              >
                <i className={`${hideAllAnnotations ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
              </button>
              <button
                onClick={(e) => {
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
                title={hideAllLabels ? "显示所有标识" : "隐藏所有标识"}
              >
                <i className={`${hideAllLabels ? 'ri-format-clear' : 'ri-text'} text-sm`}></i>
              </button>
              <span className="text-white text-xs font-medium whitespace-nowrap">测量结果</span>
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
              onWheel={(e) => e.stopPropagation()}
            >
              {(standardDistance !== null && standardDistancePoints.length === 2) || measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {/* 标准距离显示项 - 始终显示在最前面 */}
                  {standardDistance !== null && standardDistancePoints.length === 2 && (
                    <div
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40"
                    >
                      {/* 标注显示按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHidden = !isStandardDistanceHidden;
                          setIsStandardDistanceHidden(newHidden);
                          
                          // 同步全局标注隐藏状态
                          const allHidden = newHidden && measurements.every(m => hiddenAnnotationIds.has(m.id));
                          setHideAllAnnotations(allHidden);
                        }}
                        className="text-purple-400/60 hover:text-purple-400 w-4 h-4 flex items-center justify-center flex-shrink-0"
                        title={isStandardDistanceHidden ? "显示标注" : "隐藏标注"}
                      >
                        <i className={`${isStandardDistanceHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}></i>
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
                    const isSelected = selectionState.measurementId === measurement.id;
                    const isHovered = !isSelected && hoverState.measurementId === measurement.id;
                    const isLabelHidden = hiddenMeasurementIds.has(measurement.id);
                    const isAnnotationHidden = hiddenAnnotationIds.has(measurement.id);
                    
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
                          onClick={(e) => {
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
                              m.id === measurement.id ? !isAnnotationHidden : newHidden.has(m.id)
                            );
                            setHideAllAnnotations(allHidden);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isAnnotationHidden ? "显示标注" : "隐藏标注"}
                        >
                          <i className={`${isAnnotationHidden ? 'ri-eye-off-line' : 'ri-eye-line'} text-xs`}></i>
                        </button>
                        {/* 标识显示按钮 */}
                        <button
                          onClick={(e) => {
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
                              m.id === measurement.id ? !isLabelHidden : newHidden.has(m.id)
                            );
                            setHideAllLabels(allHidden);
                          }}
                          className="text-white/60 hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0"
                          title={isLabelHidden ? "显示标识" : "隐藏标识"}
                        >
                          <i className={`${isLabelHidden ? 'ri-format-clear' : 'ri-text'} text-xs`}></i>
                        </button>
                        
                        {/* 中间内容区域 */}
                        <div
                          className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: measurement.id,
                              elementType: 'whole',
                              pointIndex: null,
                            });
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setHoverState({
                              measurementId: null,
                              elementType: null,
                              pointIndex: null,
                            });
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTool === 'hand') {
                              if (selectionState.measurementId === measurement.id) {
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
                            }
                          }}
                        >
                          <span className={`truncate mr-2 font-medium ${
                            isSelected ? 'text-white' : isHovered ? 'text-yellow-300' : 'text-white/90'
                          }`}>
                            {/* 对于辅助图形，如果有自定义description则显示，否则显示type */}
                            {checkIsAuxiliaryShape(measurement.type) && measurement.description && measurement.description !== getDesc(measurement.type)
                              ? measurement.description
                              : measurement.type}
                          </span>
                          <span className={`font-mono whitespace-nowrap ${
                            isSelected
                              ? 'text-white'
                              : isHovered
                                ? (measurement.value.startsWith('-') ? 'text-blue-300' : 'text-yellow-200')
                                : (measurement.value.startsWith('-') ? 'text-blue-400' : 'text-yellow-400')
                          }`}>
                            {measurement.value}
                          </span>
                        </div>
                        
                        {/* 右侧删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMeasurementsUpdate(measurements.filter(m => m.id !== measurement.id));
                            // 如果删除的是选中项，清除选中状态（优化：使用selectionState）
                            if (selectionState.measurementId === measurement.id) {
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
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🚫 控制面板阻止了双击事件');
        }}
      >
        {/* 清空按钮 */}
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
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
            onClick={(e) => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.max(0.1, prev * 0.8);
                return newScale;
              });
            }}
            onDoubleClick={(e) => {
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
            onClick={(e) => {
              e.stopPropagation();
              setImageScale(prev => {
                const newScale = Math.min(5, prev * 1.2);
                return newScale;
              });
            }}
            onDoubleClick={(e) => {
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
            onClick={(e) => {
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
            onClick={(e) => {
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
            onClick={(e) => {
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
            onClick={(e) => {
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
      <div
        className="relative flex items-center justify-center w-full h-full"
      >
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
            onDragStart={(e) => e.preventDefault()}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              const size = {
                width: img.naturalWidth,
                height: img.naturalHeight
              };
              setImageNaturalSize(size);
              onImageSizeChange(size);
              console.log('图像加载完成，原始尺寸:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                displayWidth: img.width,
                displayHeight: img.height
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
              if (hideAllAnnotations || hiddenAnnotationIds.has(measurement.id)) {
                return false;
              }
              const isMeasurementHovered = hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';
              return renderHovered ? isMeasurementHovered : !isMeasurementHovered;
            })
            .map((measurement) => {
          // 判断是否为辅助图形(不需要标识)
          const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);
          
          // 使用配置中的颜色
          const color = getColorForType(measurement.type);
          
          // 将图像坐标转换为屏幕坐标
          const screenPoints = measurement.points.map(p => imageToScreen(p));
          // 检查整个测量是否为选中或悬浮状态（优化：使用selectionState）
          const isMeasurementSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
          const isMeasurementHovered = !isMeasurementSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

          // 根据状态确定颜色
          const displayColor = isMeasurementSelected ? "#ef4444" : isMeasurementHovered ? "#fbbf24" : color;

          return (
            <g key={measurement.id}>
              {/* 关键点 - 辅助图形不显示定位点 */}
              {!isAuxiliaryShape && screenPoints.map((point, pointIndex) => {
                // 检查是否为选中状态（优化：使用selectionState）
                const isSelected = selectionState.measurementId === measurement.id &&
                  ((selectionState.type === 'point' && selectionState.pointIndex === pointIndex) ||
                   (selectionState.type === 'whole'));
                
                // 检查是否为悬浮高亮状态（只有在非选中状态下才显示悬浮）
                const isHovered = !isSelected && hoverState.measurementId === measurement.id &&
                  ((hoverState.elementType === 'point' && hoverState.pointIndex === pointIndex) ||
                   (hoverState.elementType === 'whole'));
                
                return (
                  <g key={pointIndex}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isSelected ? "5" : isHovered ? "6" : "3"}
                      fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : displayColor}
                      stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#ffffff"}
                      strokeWidth={isSelected ? "2" : isHovered ? "3" : "1"}
                      opacity={isSelected || isHovered ? "1" : "0.8"}
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
                      fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : displayColor}
                      fontSize={isSelected || isHovered ? "14" : "12"}
                      fontWeight="bold"
                      stroke="#000000"
                      strokeWidth="0.5"
                      paintOrder="stroke"
                    >
                      {pointIndex + 1}
                    </text>
                  </g>
                );
              })}
              {/* 连接线 - 辅助图形不显示连接线，使用配置文件中的特殊渲染函数 */}
              {!isAuxiliaryShape && screenPoints.length >= 2 && 
               !((measurement.type === 'PI' || measurement.type === 'pi' || 
                  measurement.type === 'PT' || measurement.type === 'pt') && 
                 screenPoints.length < 3) && (
                <>
                  {renderSpecialSVGElements(measurement.type, screenPoints, displayColor, imageScale)}
                </>
              )}
              
              {/* 测量值标注 - 显示在测量线中间,辅助图形不显示系统文字 */}
              {!isAuxiliaryShape && screenPoints.length >= 2 && !hideAllLabels && !hiddenMeasurementIds.has(measurement.id) && (() => {
                const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
                const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';
                
                // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标
                const labelPosInImage = getLabelPositionForType(measurement.type, measurement.points, imageScale);
                // 转换为屏幕坐标
                const labelPosInScreen = imageToScreen(labelPosInImage);
                const textX = labelPosInScreen.x;
                const textY = labelPosInScreen.y;
                
                const textContent = `${measurement.type}: ${measurement.value}`;
                const fontSize = isHovered ? TEXT_LABEL_CONSTANTS.HOVER_FONT_SIZE : TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE;
                const padding = TEXT_LABEL_CONSTANTS.PADDING;
                // 估算文字宽度和高度 - 使用工具函数（不包含padding，因为需要单独使用）
                const textWidth = estimateTextWidth(textContent, fontSize, 0);
                const textHeight = estimateTextHeight(fontSize, 0);
                
                return (
                  <g>
                    {/* 白色背景 */}
                    <rect
                      x={textX - textWidth/2 - padding}
                      y={textY - textHeight/2 - padding}
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
                      fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : displayColor}
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
          const isHovered = !hoverState.measurementId && hoverState.elementType === 'point' && hoverState.pointIndex === index;
          
          return (
            <g key={`current-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r={isHovered ? "6" : "4"}
                fill="#ef4444"
                stroke={isHovered ? "#fbbf24" : "#ffffff"}
                strokeWidth={isHovered ? "3" : "2"}
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
                fill={isHovered ? "#fbbf24" : "#ef4444"}
                fontSize={isHovered ? "14" : "12"}
                fontWeight="bold"
              >
                {index + 1}
              </text>
            </g>
          );
        })}

        {/* 绘制标准距离设置的点 */}
        {!isStandardDistanceHidden && standardDistancePoints.map((point, index) => {
          const screenPoint = imageToScreen(point);
          const isHovered = hoveredStandardPointIndex === index;
          const isDragging = draggingStandardPointIndex === index;
          return (
            <g key={`standard-distance-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r={isHovered || isDragging ? "6" : "4"}
                fill={isHovered || isDragging ? "#fbbf24" : "#9333ea"}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
              />
              {/* 点序号背景 */}
              <rect
                x={screenPoint.x + (isHovered || isDragging ? 7 : 5)}
                y={screenPoint.y - (isHovered || isDragging ? 16 : 14)}
                width={isHovered || isDragging ? "12" : "10"}
                height={isHovered || isDragging ? "14" : "12"}
                fill="white"
                opacity="0.9"
                rx="2"
              />
              <text
                x={screenPoint.x + (isHovered || isDragging ? 13 : 10)}
                y={screenPoint.y - (isHovered || isDragging ? 4 : 4)}
                fill={isHovered || isDragging ? "#fbbf24" : "#9333ea"}
                fontSize={isHovered || isDragging ? "14" : "12"}
                fontWeight="bold"
                textAnchor="middle"
              >
                {index + 1}
              </text>
            </g>
          );
        })}        {/* 绘制标准距离设置的尺子样式 */}
        {!isStandardDistanceHidden && standardDistancePoints.length === 2 && (() => {
          const p1 = imageToScreen(standardDistancePoints[0]);
          const p2 = imageToScreen(standardDistancePoints[1]);

          // 计算线段的角度
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          
          // 刻度线的垂直偏移
          const tickLength = 10;
          const perpAngle = (angle + 90) * Math.PI / 180;
          
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
        {clickedPoints.length >= 2 && selectedTool !== 'hand' && (() => {
          // 转换所有点为屏幕坐标
          const screenPoints = clickedPoints.map(p => imageToScreen(p));
          return (
            <>
              {currentTool?.pointsNeeded === 4 && screenPoints.length >= 2 ? (
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
              ) : currentTool?.pointsNeeded === 3 && screenPoints.length >= 2 && 
                 !selectedTool.includes('pi') && !selectedTool.includes('pt') ? (
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
              ) : selectedTool.includes('t1-tilt') && screenPoints.length === 2 ? (
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
              ) : selectedTool.includes('t1-slope') && screenPoints.length === 2 ? (
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
              ) : selectedTool.includes('pelvic') && screenPoints.length === 2 ? (
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
              ) : selectedTool.includes('sacral') && screenPoints.length === 2 ? (
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
              ) : (selectedTool.includes('pi') || selectedTool.includes('pt')) && screenPoints.length < 3 ? (
                // PI/PT 特殊处理：点数不足3时不显示任何连线
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
        {(selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) && referenceLines.t1Tilt && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.t1Tilt);
              const lineLength = 200 * imageScale; // 水平线长度随缩放变化
              return (
                <g>
                  {/* 水平参考线 */}
                  <line
                    x1={referencePoint.x - lineLength/2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength/2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength/2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength/2 + 21}
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
                    x1={referencePoint.x - lineLength/2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength/2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength/2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength/2 + 21}
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
                    x1={referencePoint.x - lineLength/2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength/2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength/2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength/2 + 21}
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
                    x1={referencePoint.x - lineLength/2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength/2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength/2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength/2 + 21}
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
                    x1={referencePoint.x - lineLength/2}
                    y1={referencePoint.y}
                    x2={referencePoint.x + lineLength/2}
                    y2={referencePoint.y}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 水平线标识背景 */}
                  <rect
                    x={referencePoint.x + lineLength/2 + 7}
                    y={referencePoint.y - 6}
                    width="28"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 水平线标识 */}
                  <text
                    x={referencePoint.x + lineLength/2 + 21}
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
                    y1={referencePoint.y - lineLength/2}
                    x2={referencePoint.x}
                    y2={referencePoint.y + lineLength/2}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 垂直线标识背景 */}
                  <rect
                    x={referencePoint.x + 7}
                    y={referencePoint.y - lineLength/2 - 16}
                    width="26"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 垂直线标识 */}
                  <text
                    x={referencePoint.x + 20}
                    y={referencePoint.y - lineLength/2 - 3.8}
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

        {/* TS 专用第一条垂直辅助线（优化：使用referenceLines） */}
        {selectedTool.includes('ts') && referenceLines.ts && (
          <>
            {(() => {
              const referencePoint = imageToScreen(referenceLines.ts);
              const lineLength = 100 * imageScale; // 垂直线长度随缩放变化
              return (
                <g>
                  {/* 垂直辅助线 */}
                  <line
                    x1={referencePoint.x}
                    y1={referencePoint.y - lineLength/2}
                    x2={referencePoint.x}
                    y2={referencePoint.y + lineLength/2}
                    stroke="#00ff00"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  {/* 垂直线标识背景 */}
                  <rect
                    x={referencePoint.x + 7}
                    y={referencePoint.y - lineLength/2 - 16}
                    width="26"
                    height="16"
                    fill="white"
                    opacity="0.9"
                    rx="2"
                  />
                  {/* 垂直线标识 */}
                  <text
                    x={referencePoint.x + 20}
                    y={referencePoint.y - lineLength/2 - 3.8}
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

        {/* 绘制辅助圆形 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '圆形标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const center = measurement.points[0]; // 中心点
              const edge = measurement.points[1];   // 边缘点
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const radius = Math.sqrt(
                Math.pow(screenEdge.x - screenCenter.x, 2) + Math.pow(screenEdge.y - screenCenter.y, 2)
              );
              const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
              const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

              return (
                <g key={measurement.id}>
                  <circle
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    r={radius}
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                    fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#3b82f6"}
                    strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                    opacity={isSelected || isHovered ? "1" : "0.6"}
                  />
                  {/* 文字标注 - 显示在圆形中心 */}
                  {measurement.description && (
                    <text
                      x={screenCenter.x}
                      y={screenCenter.y + 5}
                      fill="#1e40af"
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

        {/* 绘制圆形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'circle' && (() => {
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
              const edge = measurement.points[1];   // 边界点
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const radiusX = Math.abs(screenEdge.x - screenCenter.x);
              const radiusY = Math.abs(screenEdge.y - screenCenter.y);
              const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
              const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

              return (
                <g key={measurement.id}>
                  <ellipse
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    rx={radiusX}
                    ry={radiusY}
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                    fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#8b5cf6"}
                    strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                    opacity={isSelected || isHovered ? "1" : "0.6"}
                  />
                  {/* 文字标注 - 显示在椭圆中心 */}
                  {measurement.description && (
                    <text
                      x={screenCenter.x}
                      y={screenCenter.y + 5}
                      fill="#6d28d9"
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

        {/* 绘制椭圆预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'ellipse' && (() => {
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
              const topLeft = imageToScreen(measurement.points[0]);
              const bottomRight = imageToScreen(measurement.points[1]);
              const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
              const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';
              const minX = Math.min(topLeft.x, bottomRight.x);
              const minY = Math.min(topLeft.y, bottomRight.y);
              const width = Math.abs(bottomRight.x - topLeft.x);
              const height = Math.abs(bottomRight.y - topLeft.y);

              return (
                <g key={measurement.id}>
                  <rect
                    x={minX}
                    y={minY}
                    width={width}
                    height={height}
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                    fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#ec4899"}
                    strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                    opacity={isSelected || isHovered ? "1" : "0.6"}
                  />
                  {/* 文字标注 - 显示在矩形中心 */}
                  {measurement.description && (
                    <text
                      x={minX + width / 2}
                      y={minY + height / 2 + 5}
                      fill="#be185d"
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

        {/* 绘制矩形预览 */}
        {drawingState.isDrawing &&
          drawingState.startPoint &&
          drawingState.currentPoint &&
          selectedTool === 'rectangle' && (() => {
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
              const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
              const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

              // 确定箭头头部的marker
              let markerEnd = "url(#arrowhead-normal)";
              if (isSelected) {
                markerEnd = "url(#arrowhead-selected)";
              } else if (isHovered) {
                markerEnd = "url(#arrowhead-hovered)";
              }

              return (
                <g key={measurement.id}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#f59e0b"}
                    strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                    markerEnd={markerEnd}
                    opacity={isSelected || isHovered ? "1" : "0.6"}
                  />
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
          selectedTool === 'arrow' && (() => {
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
            const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
            const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';
            
            return (
              <polygon
                key={measurement.id}
                points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#06b6d4"}
                strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                opacity={isSelected || isHovered ? "1" : "0.6"}
              />
            );
          })}

        {/* 绘制多边形预览 - 使用 clickedPoints */}
        {selectedTool === 'polygon' && clickedPoints.length > 0 && (() => {
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
            const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
            const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

            // 计算中心点
            const center = calculateQuadrilateralCenter(measurement.points);
            const centerScreen = imageToScreen(center);

            return (
              <g key={measurement.id}>
                {/* 绘制四边形轮廓 */}
                <polygon
                  points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.6"}
                />

                {/* 绘制四个角点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`corner-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
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
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* 内圆 */}
                  <circle
                    cx={centerScreen.x}
                    cy={centerScreen.y}
                    r="3"
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
                    opacity="0.9"
                  />
                  {/* 十字 - 水平线 */}
                  <line
                    x1={centerScreen.x - 12}
                    y1={centerScreen.y}
                    x2={centerScreen.x + 12}
                    y2={centerScreen.y}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* 十字 - 垂直线 */}
                  <line
                    x1={centerScreen.x}
                    y1={centerScreen.y - 12}
                    x2={centerScreen.x}
                    y2={centerScreen.y + 12}
                    stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                </g>

                {/* 中心点文字标签 */}
                <text
                  x={centerScreen.x}
                  y={centerScreen.y - 18}
                  fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#10b981"}
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
        {selectedTool === 'vertebra-center' && clickedPoints.length > 0 && (() => {
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
              {clickedPoints.length === 4 && (() => {
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
            const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
            const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

            // 计算距离值
            const config = getAnnotationConfig('aux-length');
            const results = config?.calculateResults(measurement.points, {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
            }) || [];
            const distanceText = results.length > 0 ? `${results[0].value}${results[0].unit}` : '';

            // 计算中点位置
            const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
            const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

            return (
              <g key={measurement.id}>
                {/* 绘制线段 */}
                <line
                  x1={screenPoints[0].x}
                  y1={screenPoints[0].y}
                  x2={screenPoints[1].x}
                  y2={screenPoints[1].y}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#3b82f6"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.8"}
                />
                {/* 绘制端点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#3b82f6"}
                    opacity={isSelected || isHovered ? "1" : "0.8"}
                  />
                ))}
                {/* 绘制距离文字 */}
                <text
                  x={midX}
                  y={midY - 10}
                  fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#3b82f6"}
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.9"
                >
                  {distanceText}
                </text>
              </g>
            );
          })}

        {/* 绘制距离标注预览 - 使用 clickedPoints */}
        {selectedTool === 'aux-length' && clickedPoints.length > 0 && (() => {
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
              {screenPoints.length === 2 && (() => {
                const config = getAnnotationConfig('aux-length');
                const results = config?.calculateResults(clickedPoints, {
                  standardDistance,
                  standardDistancePoints,
                  imageNaturalSize,
                }) || [];
                const distanceText = results.length > 0 ? `${results[0].value}${results[0].unit}` : '';
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

        {/* 绘制角度标注 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '角度标注')
          .map(measurement => {
            if (measurement.points.length !== 3) return null;

            const screenPoints = measurement.points.map(p => imageToScreen(p));
            const isSelected = selectionState.measurementId === measurement.id && selectionState.type === 'whole';
            const isHovered = !isSelected && hoverState.measurementId === measurement.id && hoverState.elementType === 'whole';

            // 计算角度值
            const config = getAnnotationConfig('aux-angle');
            const results = config?.calculateResults(measurement.points, {
              standardDistance,
              standardDistancePoints,
              imageNaturalSize,
            }) || [];
            const angleText = results.length > 0 ? `${results[0].value}${results[0].unit}` : '';

            return (
              <g key={measurement.id}>
                {/* 绘制两条线段 */}
                <line
                  x1={screenPoints[0].x}
                  y1={screenPoints[0].y}
                  x2={screenPoints[1].x}
                  y2={screenPoints[1].y}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#8b5cf6"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.8"}
                />
                <line
                  x1={screenPoints[1].x}
                  y1={screenPoints[1].y}
                  x2={screenPoints[2].x}
                  y2={screenPoints[2].y}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#8b5cf6"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.8"}
                />
                {/* 绘制三个点 */}
                {screenPoints.map((point, idx) => (
                  <circle
                    key={`point-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#8b5cf6"}
                    opacity={isSelected || isHovered ? "1" : "0.8"}
                  />
                ))}
                {/* 绘制角度文字（在顶点上方） */}
                <text
                  x={screenPoints[1].x}
                  y={screenPoints[1].y - 15}
                  fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#8b5cf6"}
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
        {selectedTool === 'aux-angle' && clickedPoints.length > 0 && (() => {
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
              {screenPoints.length === 3 && (
                <>
                  <line
                    x1={screenPoints[1].x}
                    y1={screenPoints[1].y}
                    x2={screenPoints[2].x}
                    y2={screenPoints[2].y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  {(() => {
                    const config = getAnnotationConfig('aux-angle');
                    const results = config?.calculateResults(clickedPoints, {
                      standardDistance,
                      standardDistancePoints,
                      imageNaturalSize,
                    }) || [];
                    const angleText = results.length > 0 ? `${results[0].value}${results[0].unit}` : '';

                    return (
                      <text
                        x={screenPoints[1].x}
                        y={screenPoints[1].y - 15}
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
            const measurement = measurements.find(m => m.id === selectionState.measurementId);
            if (measurement) {
              selectedMeasurement = measurement;
              if (selectionState.type === 'point' && selectionState.pointIndex !== null) {
                // 只显示选中的点
                selectedPoints = [measurement.points[selectionState.pointIndex]];
              } else {
                // 显示整个测量结果
                selectedPoints = measurement.points;
              }
            }
          } else if (selectionState.pointIndex !== null && clickedPoints[selectionState.pointIndex]) {
            // 选中了单个点
            selectedPoints = [clickedPoints[selectionState.pointIndex]];
          }

          if (selectedPoints.length === 0) return null;

          // 计算边界框
          let minX: number, maxX: number, minY: number, maxY: number;

          // 针对不同类型的图形计算不同的边界框（优化：使用selectionState）
          if (selectedMeasurement && selectionState.type === 'whole') {
            // 辅助图形需要特殊处理
            if (selectedMeasurement.type === '圆形标注' && selectedMeasurement.points.length >= 2) {
              const center = selectedMeasurement.points[0];
              const edge = selectedMeasurement.points[1];
              // 使用屏幕坐标系计算半径
              const screenCenter = imageToScreen(center);
              const screenEdge = imageToScreen(edge);
              const screenRadius = Math.sqrt(
                Math.pow(screenEdge.x - screenCenter.x, 2) + Math.pow(screenEdge.y - screenCenter.y, 2)
              );
              
              minX = screenCenter.x - screenRadius - 15;
              maxX = screenCenter.x + screenRadius + 15;
              minY = screenCenter.y - screenRadius - 15;
              maxY = screenCenter.y + screenRadius + 15;
            } else if (selectedMeasurement.type === '椭圆标注' && selectedMeasurement.points.length >= 2) {
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
            } else if (selectedMeasurement.type === '矩形标注' && selectedMeasurement.points.length >= 2) {
              const start = selectedMeasurement.points[0];
              const end = selectedMeasurement.points[1];
              const startScreen = imageToScreen(start);
              const endScreen = imageToScreen(end);
              
              minX = Math.min(startScreen.x, endScreen.x) - 15;
              maxX = Math.max(startScreen.x, endScreen.x) + 15;
              minY = Math.min(startScreen.y, endScreen.y) - 15;
              maxY = Math.max(startScreen.y, endScreen.y) + 15;
            } else if (selectedMeasurement.type === '箭头标注' && selectedMeasurement.points.length >= 2) {
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
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded">
        {selectedTool === 'hand' ? (
          <div>
            <p className="font-medium">移动模式 {isImagePanLocked && <span className="text-yellow-400">🔒 图像已锁定</span>}</p>
            <p>点击选中标注 | 拖拽移动 | 点击删除按钮删除</p>
            <p className="text-gray-400 mt-1">{isImagePanLocked ? '图像已锁定，拖拽不会移动图像' : '或拖拽移动图像'} | 滚轮缩放</p>
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
              <p className="text-green-400 mt-1">距离已计算（根据标准距离换算）</p>
            )}
          </div>
        ) : selectedTool === 'aux-angle' ? (
          <div>
            <p className="font-medium">角度标注模式</p>
            <p>已标注 {clickedPoints.length}/3 个点</p>
            {clickedPoints.length === 0 && (
              <p className="text-yellow-400 mt-1">点击第1个点</p>
            )}
            {clickedPoints.length === 1 && (
              <p className="text-yellow-400 mt-1">点击顶点（第2个点）</p>
            )}
            {clickedPoints.length === 2 && (
              <p className="text-yellow-400 mt-1">点击第3个点完成测量</p>
            )}
            {clickedPoints.length === 3 && (
              <p className="text-green-400 mt-1">角度已计算</p>
            )}
          </div>
        ) : selectedTool.includes('t1-tilt') ? (
          <div>
            <p className="font-medium">T1 Tilt 测量模式</p>
            <p>
              已标注 {clickedPoints.length}/2 个点
            </p>
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
            </p>
            {clickedPoints.length < pointsNeeded && (
              <p className="text-yellow-400 mt-1">点击图像标注关键点</p>
            )}
          </div>
        )}
        {isHovering && <p className="text-blue-400 mt-1">滚轮缩放已激活</p>}
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
          onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">编辑图形文字</h3>
            <input
              type="text"
              value={editLabelDialog.currentLabel}
              onChange={(e) => setEditLabelDialog(prev => ({
                ...prev,
                currentLabel: e.target.value
              }))}
              onKeyDown={(e) => {
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
