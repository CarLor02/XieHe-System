'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createAuthenticatedClient } from '../../../../store/authStore';
import {
  Point as ConfigPoint,
  CalculationContext,
  getAnnotationConfig,
} from './annotationConfig';
import {
  calculateMeasurementValue as calcMeasurementValue,
  getDescriptionForType as getDesc,
  getToolsForExamType as getTools,
  getColorForType,
  getLabelPositionForType,
  isAuxiliaryShape as checkIsAuxiliaryShape,
  renderSpecialSVGElements,
} from './annotationHelpers';
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
  description?: string;
}

interface Point {
  x: number;
  y: number;
}

interface Circle {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
}

interface Ellipse {
  id: string;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}

interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Arrow {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Polygon {
  id: string;
  points: Point[];
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
  const [isMeasurementsLoading, setIsMeasurementsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);

  // 标准距离设置
  const [standardDistance, setStandardDistance] = useState<number | null>(null);
  const [standardDistanceValue, setStandardDistanceValue] = useState('');
  const [showStandardDistancePanel, setShowStandardDistancePanel] =
    useState(false);
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

  // 从API获取真实的影像数据
  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setStudyLoading(true);
        // 直接使用imageId作为image_files表的ID
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/image-files/${numericId}`);
        const imageFile = response.data;
        
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
    // 使用统一的配置系统计算测量值
    const defaultValue = calculateMeasurementValue(type, points) || '0.0°';
    const description = getDescriptionForType(type);

    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      type,
      value: defaultValue,
      points: points,
      description,
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
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

        if (response.data && response.data.items) {
          // 从API响应中提取影像ID，格式为IMG{id}
          const ids = response.data.items.map((item: any) => {
            // 使用item.id来生成影像ID
            return `IMG${item.id.toString().padStart(3, '0')}`;
          });
          setImageList(ids);
        }
      } catch (error) {
        console.error('获取影像列表失败:', error);
        // 如果获取失败，使用空列表
        setImageList([]);
      }
    };

    fetchImageList();
  }, []);

  const currentIndex = imageList.indexOf(imageId);

  const goToPreviousImage = () => {
    if (currentIndex > 0) {
      const previousImageId = imageList[currentIndex - 1];
      router.push(`/imaging/${previousImageId}/viewer`);
    }
  };

  const goToNextImage = () => {
    if (currentIndex < imageList.length - 1) {
      const nextImageId = imageList[currentIndex + 1];
      router.push(`/imaging/${nextImageId}/viewer`);
    }
  };

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

      if (response.status === 200 && response.data.report) {
        setReportText(response.data.report);
        setSaveMessage('报告生成成功');
        setTimeout(() => setSaveMessage(''), 3000);
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
        const data = response.data;
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
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: m.type,
              value: calculateMeasurementValue(m.type, scaledPoints),
              points: scaledPoints,
              description: getDescriptionForType(m.type)
            };
          });
          setMeasurements(restoredMeasurements);
          console.log(`已从本地加载 ${restoredMeasurements.length} 个标注`);
        }
        
        // 加载或设置默认标准距离
        if (data.standardDistance && data.standardDistancePoints && data.standardDistancePoints.length === 2) {
          // 如果有保存的标准距离，加载它
          const scaledStandardPoints = data.standardDistancePoints.map((p: any) => ({
            x: p.x * (imageNaturalSize ? imageNaturalSize.width / (data.imageWidth || imageNaturalSize.width) : 1),
            y: p.y * (imageNaturalSize ? imageNaturalSize.height / (data.imageHeight || imageNaturalSize.height) : 1)
          }));
          setStandardDistance(data.standardDistance);
          setStandardDistancePoints(scaledStandardPoints);
          console.log(`已加载标准距离: ${data.standardDistance}mm`);
        } else if (imageNaturalSize) {
          // 如果没有保存的标准距离，设置默认值：左上角(0,0)到(200,0)，标准距离100mm
          const defaultPoints = [
            { x: 0, y: 0 },
            { x: 200, y: 0 }
          ];
          setStandardDistance(100);
          setStandardDistancePoints(defaultPoints);
          console.log('未找到标准距离，已设置默认值: 100mm，标注点: (0,0)到(200,0)');
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

      console.log('保存响应:', response.status, response.data);

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
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
      const { accessToken } = require('../../../../store/authStore').useAuthStore.getState();
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
      
      const aiResponse = await fetch(aiDetectUrl, {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error('AI检测失败');
      }

      const aiData = await aiResponse.json();
      console.log('AI检测原始结果:', aiData);

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
            console.log('从DOM获取图像尺寸:', actualImageSize);
          }
        }
        
        console.log('AI返回的图像尺寸:', {
          aiWidth: aiImageWidth,
          aiHeight: aiImageHeight,
          actualImageSize: actualImageSize
        });
        
        // 坐标转换：AI返回的是基于原始图像尺寸的坐标
        // 我们需要检查是否需要缩放
        let scaleX = 1;
        let scaleY = 1;
        
        if (actualImageSize && aiImageWidth && aiImageHeight) {
          // 如果AI处理的图像尺寸与实际图像尺寸不同，需要缩放坐标
          scaleX = actualImageSize.width / aiImageWidth;
          scaleY = actualImageSize.height / aiImageHeight;
          console.log('坐标缩放比例:', { scaleX, scaleY });
        } else if (aiImageWidth && aiImageHeight) {
          // 如果获取不到实际尺寸，假设AI返回的尺寸就是实际尺寸（不需要缩放）
          console.log('使用AI图像尺寸作为实际尺寸，不进行缩放');
        } else {
          console.warn('缺少图像尺寸信息，无法进行坐标转换');
        }
        
        const aiMeasurements = aiData.measurements.map((m: any) => {
          console.log(`处理测量 ${m.type}，原始点:`, m.points);
          
          // 特殊处理：将AI返回的RSH转换为CA
          let measurementType = m.type;
          if (measurementType === 'RSH' || measurementType === 'rsh') {
            measurementType = 'CA';
            console.log('AI检测返回RSH，已转换为CA');
          }
          
          // 获取该标注类型所需的点数
          const tools = getTools(imageData.examType);
          const tool = tools.find((t: any) => t.id === measurementType.toLowerCase() || t.name === measurementType);
          const requiredPoints = tool?.pointsNeeded || m.points.length;
          
          // 如果返回的点数超过所需点数，只保留所需数量的点
          let processedPoints = m.points;
          if (requiredPoints > 0 && m.points.length > requiredPoints) {
            processedPoints = m.points.slice(0, requiredPoints);
            console.log(`${measurementType} 返回了 ${m.points.length} 个点，只保留前 ${requiredPoints} 个点`);
          }
          
          // 转换坐标
          const scaledPoints = processedPoints.map((p: any) => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          }));
          
          console.log(`转换后的点:`, scaledPoints);
          
          // 根据type和points重新计算value
          const value = calculateMeasurementValue(measurementType, scaledPoints);
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: measurementType,
            value: value,
            points: scaledPoints,
            description: getDescriptionForType(measurementType)
          };
        });
        
        console.log('转换后的测量结果:', aiMeasurements);
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

      console.log('保存响应:', response.status, response.data);

      if (response.status === 200) {
        setSaveMessage('测量数据保存成功');
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
                        onKeyPress={e => {
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

  // 选中状态 - 重新设计的选中系统
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectionType, setSelectionType] = useState<'point' | 'whole' | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // T1 tilt 特殊状态管理
  const [t1TiltHorizontalLine, setT1TiltHorizontalLine] = useState<Point | null>(null);

  // CA 特殊状态管理
  const [caHorizontalLine, setCaHorizontalLine] = useState<Point | null>(null);

  // Pelvic 特殊状态管理
  const [pelvicHorizontalLine, setPelvicHorizontalLine] = useState<Point | null>(null);

  // Sacral 特殊状态管理
  const [sacralHorizontalLine, setSacralHorizontalLine] = useState<Point | null>(null);

  // AVT 特殊状态管理 - 存储第一个点用于绘制第一条垂直线
  const [avtFirstVerticalLine, setAvtFirstVerticalLine] = useState<Point | null>(null);

  // TS 特殊状态管理 - 存储第一个点用于绘制第一条垂直线
  const [tsFirstVerticalLine, setTsFirstVerticalLine] = useState<Point | null>(null);

  // SS（骶骨倾斜角）特殊状态管理 - 侧位，水平参考线
  const [ssHorizontalLine, setSsHorizontalLine] = useState<Point | null>(null);

  // SVA（矢状面垂直轴）特殊状态管理 - 存储第一个点用于绘制第一条垂直线
  const [svaFirstVerticalLine, setSvaFirstVerticalLine] = useState<Point | null>(null);

  // 悬浮高亮状态 - 用于预览即将被选中的元素
  const [hoveredMeasurementId, setHoveredMeasurementId] = useState<string | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredElementType, setHoveredElementType] = useState<'point' | 'whole' | null>(null);

  // 隐藏标注状态 - 用于控制标注标识的显示/隐藏
  const [hiddenMeasurementIds, setHiddenMeasurementIds] = useState<Set<string>>(new Set());
  const [hideAllLabels, setHideAllLabels] = useState(false);
  
  // 隐藏整个标注状态 - 用于控制整个标注（图形+标识）的显示/隐藏
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(new Set());
  const [hideAllAnnotations, setHideAllAnnotations] = useState(false);
  
  // 标准距离可见性状态
  const [isStandardDistanceHidden, setIsStandardDistanceHidden] = useState(false);

  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

  // 监听工具切换，清理T1 Tilt和CA状态
  useEffect(() => {
    if (!selectedTool.includes('t1-tilt')) {
      setT1TiltHorizontalLine(null);
    }
    if (!selectedTool.includes('ca')) {
      setCaHorizontalLine(null);
    }
    if (!selectedTool.includes('pelvic')) {
      setPelvicHorizontalLine(null);
    }
    if (!selectedTool.includes('sacral')) {
      setSacralHorizontalLine(null);
    }
    if (!selectedTool.includes('avt')) {
      setAvtFirstVerticalLine(null);
    }
    if (!selectedTool.includes('ts')) {
      setTsFirstVerticalLine(null);
    }
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

  // 坐标转换函数：将图像坐标系转换为屏幕坐标系
  // 图像坐标系：左上角为原点，右为x正，下为y正（标准图像坐标系）
  // 屏幕坐标系：容器内的显示坐标（相对于容器左上角）
  const imageToScreen = (point: Point): Point => {
    if (!imageNaturalSize) {
      return { x: point.x, y: point.y };
    }
    
    // 获取容器信息
    const container = document.querySelector('[data-image-canvas]');
    if (!container) {
      return { x: point.x, y: point.y };
    }
    
    const containerRect = container.getBoundingClientRect();
    
    // 计算图像在object-contain模式下的实际显示尺寸
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    
    let displayWidth: number, displayHeight: number;
    if (containerAspect > imageAspect) {
      // 容器更宽，图像按高度适配
      displayHeight = containerRect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      // 容器更高，图像按宽度适配
      displayWidth = containerRect.width;
      displayHeight = displayWidth / imageAspect;
    }
    
    // 容器中心点（也是图像transform的原点）
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // 图像中心点坐标
    const imageCenterX = imageNaturalSize.width / 2;
    const imageCenterY = imageNaturalSize.height / 2;
    
    // 转换步骤（关键：transform origin是center center）：
    // 1. 图像像素坐标 - 图像中心 = 相对于图像中心的坐标
    // 2. / imageNaturalSize * displaySize = 缩放到显示尺寸
    // 3. * imageScale = 用户缩放
    // 4. + imagePosition = 用户平移（相对于容器中心）
    // 5. + centerX = 转到容器坐标系
    const relToImageCenterX = point.x - imageCenterX;
    const relToImageCenterY = point.y - imageCenterY;
    
    const displayX = (relToImageCenterX / imageNaturalSize.width) * displayWidth;
    const displayY = (relToImageCenterY / imageNaturalSize.height) * displayHeight;
    
    const scaledX = displayX * imageScale;
    const scaledY = displayY * imageScale;
    
    const screenX = scaledX + imagePosition.x + centerX;
    const screenY = scaledY + imagePosition.y + centerY;
    
    return { x: screenX, y: screenY };
  };

  // 坐标转换函数：将屏幕坐标系转换为图像坐标系
  // 屏幕坐标系：容器内的显示坐标（相对于容器左上角，从handleMouseDown/Move传入）
  // 图像坐标系：左上角为原点，右为x正，下为y正（标准图像坐标系）
  const screenToImage = (screenX: number, screenY: number): Point => {
    if (!imageNaturalSize) {
      return { x: screenX, y: screenY };
    }
    
    // 获取容器信息
    const container = document.querySelector('[data-image-canvas]');
    if (!container) {
      return { x: screenX, y: screenY };
    }
    
    const containerRect = container.getBoundingClientRect();
    
    // 计算图像在object-contain模式下的实际显示尺寸
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    
    let displayWidth: number, displayHeight: number;
    if (containerAspect > imageAspect) {
      // 容器更宽，图像按高度适配
      displayHeight = containerRect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      // 容器更高，图像按宽度适配
      displayWidth = containerRect.width;
      displayHeight = displayWidth / imageAspect;
    }
    
    // 容器中心点（也是图像transform的原点）
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // 图像中心点坐标
    const imageCenterX = imageNaturalSize.width / 2;
    const imageCenterY = imageNaturalSize.height / 2;
    
    // 逆向转换步骤：
    // 1. screenX - centerX = 从容器坐标系转到中心坐标系
    // 2. - imagePosition = 减去用户平移
    // 3. / imageScale = 除以用户缩放
    // 4. / displaySize * imageNaturalSize = 转换为图像坐标（相对于图像中心）
    // 5. + 图像中心 = 转换为图像像素坐标（相对于左上角）
    const relToCenterX = screenX - centerX - imagePosition.x;
    const relToCenterY = screenY - centerY - imagePosition.y;
    
    const displayX = relToCenterX / imageScale;
    const displayY = relToCenterY / imageScale;
    
    const relToImageCenterX = (displayX / displayWidth) * imageNaturalSize.width;
    const relToImageCenterY = (displayY / displayHeight) * imageNaturalSize.height;
    
    const imageX = relToImageCenterX + imageCenterX;
    const imageY = relToImageCenterY + imageCenterY;
    
    return { x: imageX, y: imageY };
  };

  // 计算函数已移至annotationConfig.ts中

  // 获取图像数据
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setImageLoading(true);
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';

        // 使用fetch API直接获取，确保认证头被正确传递
        const { accessToken } =
          require('../../../../store/authStore').useAuthStore.getState();

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
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageId]);

  const getImageUrl = (examType: string) => {
    return imageUrl;
  };
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
        
        // 辅助函数: 计算点到线段的距离
        const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
          const dx = lineEnd.x - lineStart.x;
          const dy = lineEnd.y - lineStart.y;
          const lengthSquared = dx * dx + dy * dy;
          
          if (lengthSquared === 0) {
            // 线段退化为点
            return Math.sqrt(
              Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
            );
          }
          
          // 计算投影参数t
          let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
          t = Math.max(0, Math.min(1, t)); // 限制在线段范围内
          
          // 计算投影点
          const projX = lineStart.x + t * dx;
          const projY = lineStart.y + t * dy;
          
          return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
        };
        
        // 辅助函数: 检查点是否在边界框内
        const isPointInBounds = (point: Point, points: Point[]): boolean => {
          if (points.length === 0) return false;
          const xs = points.map(p => p.x);
          const ys = points.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const padding = 15 / imageScale;
          
          return point.x >= minX - padding && point.x <= maxX + padding &&
                 point.y >= minY - padding && point.y <= maxY + padding;
        };
        
        // 辅助函数: 检查点是否在文字标识区域
        const isPointInTextLabel = (point: Point, measurement: any): boolean => {
          // 计算测量值标注的位置和范围
          if (measurement.points.length < 2) return false;
          
          // 使用配置文件中的标注位置计算函数
          const { x: textX, y: textY } = getLabelPositionForType(measurement.type, measurement.points, imageScale);
          
          // 估算文字宽度和高度（与SVG渲染保持一致）
          const textContent = `${measurement.type}: ${measurement.value}`;
          const fontSize = 14; // 默认字号（非hover状态）
          const padding = 4; // padding值
          // 在图像坐标系中，需要将屏幕像素转换为图像坐标
          const textWidth = (textContent.length * fontSize * 0.6 + padding * 2) / imageScale;
          const textHeight = (fontSize * 1.4 + padding * 2) / imageScale;
          
          return point.x >= textX - textWidth / 2 && point.x <= textX + textWidth / 2 &&
                 point.y >= textY - textHeight / 2 && point.y <= textY + textHeight / 2;
        };

        
        // 先检查是否点击了已有的测量结果或点
        let foundSelection = false;
        let selectedMeasurement: any = null;
        let selectedPointIdx: number | null = null;
        let selType: 'point' | 'whole' | null = null;
        
        // 点击阈值（屏幕像素）
        const screenPoint = { x, y };
        const pointClickRadius = 10; // 屏幕像素
        const lineClickRadius = 8; // 屏幕像素
        
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
              const distance = Math.sqrt(
                Math.pow(screenPoint.x - pointScreen.x, 2) + Math.pow(screenPoint.y - pointScreen.y, 2)
              );
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
                // 圆形:检查是否点击了圆边界
                const centerScreen = imageToScreen(measurement.points[0]);
                const edgeScreen = imageToScreen(measurement.points[1]);
                const screenRadius = Math.sqrt(
                  Math.pow(edgeScreen.x - centerScreen.x, 2) + Math.pow(edgeScreen.y - centerScreen.y, 2)
                );
                const distToCenter = Math.sqrt(
                  Math.pow(screenPoint.x - centerScreen.x, 2) + Math.pow(screenPoint.y - centerScreen.y, 2)
                );
                // 检查是否在圆边界附近
                if (Math.abs(distToCenter - screenRadius) < lineClickRadius) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '椭圆标注' && measurement.points.length === 2) {
                // 椭圆:检查是否点击了椭圆边界
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
                  // 检查是否在椭圆边界附近
                  if (Math.abs(normalizedDist - 1) < lineClickRadius / Math.min(radiusX, radiusY)) {
                    selectedMeasurement = measurement;
                    selType = 'whole';
                    foundSelection = true;
                  }
                }
              } else if (measurement.type === '矩形标注' && measurement.points.length === 2) {
                // 矩形:检查是否点击了矩形边界
                const p1Screen = imageToScreen(measurement.points[0]);
                const p2Screen = imageToScreen(measurement.points[1]);
                const minX = Math.min(p1Screen.x, p2Screen.x);
                const maxX = Math.max(p1Screen.x, p2Screen.x);
                const minY = Math.min(p1Screen.y, p2Screen.y);
                const maxY = Math.max(p1Screen.y, p2Screen.y);
                
                // 检查是否点击了四条边中的任意一条
                const distToLeft = Math.abs(screenPoint.x - minX);
                const distToRight = Math.abs(screenPoint.x - maxX);
                const distToTop = Math.abs(screenPoint.y - minY);
                const distToBottom = Math.abs(screenPoint.y - maxY);
                
                const onLeftOrRight = (distToLeft < lineClickRadius || distToRight < lineClickRadius) && 
                                      screenPoint.y >= minY - lineClickRadius && screenPoint.y <= maxY + lineClickRadius;
                const onTopOrBottom = (distToTop < lineClickRadius || distToBottom < lineClickRadius) && 
                                       screenPoint.x >= minX - lineClickRadius && screenPoint.x <= maxX + lineClickRadius;
                
                if (onLeftOrRight || onTopOrBottom) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              } else if (measurement.type === '多边形标注' && measurement.points.length >= 3) {
                // 多边形:检查是否点击了任意一条边（使用屏幕坐标）
                for (let i = 0; i < measurement.points.length; i++) {
                  const currentScreen = imageToScreen(measurement.points[i]);
                  const nextScreen = imageToScreen(measurement.points[(i + 1) % measurement.points.length]);
                  
                  // 计算点到线段的距离（屏幕坐标）
                  const dx = nextScreen.x - currentScreen.x;
                  const dy = nextScreen.y - currentScreen.y;
                  const lengthSquared = dx * dx + dy * dy;
                  
                  let distToEdge: number;
                  if (lengthSquared === 0) {
                    distToEdge = Math.sqrt(
                      Math.pow(screenPoint.x - currentScreen.x, 2) + Math.pow(screenPoint.y - currentScreen.y, 2)
                    );
                  } else {
                    let t = ((screenPoint.x - currentScreen.x) * dx + (screenPoint.y - currentScreen.y) * dy) / lengthSquared;
                    t = Math.max(0, Math.min(1, t));
                    const projX = currentScreen.x + t * dx;
                    const projY = currentScreen.y + t * dy;
                    distToEdge = Math.sqrt(Math.pow(screenPoint.x - projX, 2) + Math.pow(screenPoint.y - projY, 2));
                  }
                  
                  if (distToEdge < lineClickRadius) {
                    selectedMeasurement = measurement;
                    selType = 'whole';
                    foundSelection = true;
                    break;
                  }
                }
              } else if (measurement.type === '箭头标注' && measurement.points.length >= 2) {
                // 箭头:检查是否点击了箭头线段（使用屏幕坐标）
                const startScreen = imageToScreen(measurement.points[0]);
                const endScreen = imageToScreen(measurement.points[1]);
                
                // 计算点到线段的距离（屏幕坐标）
                const dx = endScreen.x - startScreen.x;
                const dy = endScreen.y - startScreen.y;
                const lengthSquared = dx * dx + dy * dy;
                
                let distToLine: number;
                if (lengthSquared === 0) {
                  distToLine = Math.sqrt(
                    Math.pow(screenPoint.x - startScreen.x, 2) + Math.pow(screenPoint.y - startScreen.y, 2)
                  );
                } else {
                  let t = ((screenPoint.x - startScreen.x) * dx + (screenPoint.y - startScreen.y) * dy) / lengthSquared;
                  t = Math.max(0, Math.min(1, t));
                  const projX = startScreen.x + t * dx;
                  const projY = startScreen.y + t * dy;
                  distToLine = Math.sqrt(Math.pow(screenPoint.x - projX, 2) + Math.pow(screenPoint.y - projY, 2));
                }
                
                if (distToLine < lineClickRadius) {
                  selectedMeasurement = measurement;
                  selType = 'whole';
                  foundSelection = true;
                }
              }
            } else {
              // 非辅助图形:检查文字标识区域（使用屏幕坐标）
              const screenPoints = measurement.points.map(p => imageToScreen(p));
              
              // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标，然后转换为屏幕坐标
              const labelPosInImage = getLabelPositionForType(measurement.type, measurement.points, imageScale);
              const labelPosInScreen = imageToScreen(labelPosInImage);
              const textBaselineX = labelPosInScreen.x;
              const textBaselineY = labelPosInScreen.y;
              
              const textContent = `${measurement.type}: ${measurement.value}`;
              const fontSize = 14; // 默认字号（与SVG渲染保持一致）
              const padding = 4; // padding值（与SVG渲染保持一致）
              const textWidth = textContent.length * fontSize * 0.6 + padding * 2;
              const textHeight = fontSize * 1.4 + padding * 2;
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
            setSelectedMeasurementId(selectedMeasurement.id);
            setSelectionType(selType);
            setIsDraggingSelection(false); // 初始不拖拽,点击时只选中
            
            if (selType === 'point') {
              // 选中单个点（dragOffset仍使用图像坐标）
              setSelectedPointIndex(selectedPointIdx);
              const point = selectedMeasurement.points[selectedPointIdx!];
              const imagePoint = screenToImage(x, y);
              setDragOffset({
                x: imagePoint.x - point.x,
                y: imagePoint.y - point.y,
              });
            } else {
              // 选中整个测量结果（dragOffset仍使用图像坐标）
              setSelectedPointIndex(null);
              const xs = selectedMeasurement.points.map((p: Point) => p.x);
              const ys = selectedMeasurement.points.map((p: Point) => p.y);
              const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
              const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
              const imagePoint = screenToImage(x, y);
              setDragOffset({
                x: imagePoint.x - centerX,
                y: imagePoint.y - centerY,
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
              setSelectedMeasurementId(null);
              setSelectedPointIndex(i);
              setSelectionType('point');
              setIsDraggingSelection(false); // 初始不拖拽
              const imagePoint = screenToImage(x, y);
              setDragOffset({
                x: imagePoint.x - point.x,
                y: imagePoint.y - point.y,
              });
              foundSelection = true;
              break;
            }
          }
        }
        
        // 3. 如果没有点击到任何对象,检查是否点击了已选中对象的允许拖拽区域内
        if (!foundSelection && selectedMeasurementId) {
          const measurement = measurements.find(m => m.id === selectedMeasurementId);
          if (measurement && measurement.points.length > 0) {
            // 如果是点级别选择，只允许在选中点的选中框内拖拽
            if (selectionType === 'point' && selectedPointIndex !== null) {
              const selectedPoint = measurement.points[selectedPointIndex];
              
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
                // 在选中框内,可以拖拽
                setDragOffset({
                  x: imagePoint.x - selectedPoint.x,
                  y: imagePoint.y - selectedPoint.y,
                });
                foundSelection = true;
              }
            } else if (selectionType === 'whole') {
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
                // 在选中框内,重新计算到中心的偏移
                const centerX = (Math.min(...measurement.points.map(p => p.x)) + Math.max(...measurement.points.map(p => p.x))) / 2;
                const centerY = (Math.min(...measurement.points.map(p => p.y)) + Math.max(...measurement.points.map(p => p.y))) / 2;
                setDragOffset({
                  x: imagePoint.x - centerX,
                  y: imagePoint.y - centerY,
                });
                foundSelection = true;
              }
            }
          }
        }
        
        // 4. 如果没有点击到任何对象且不在已选中对象的边界框内,则取消选中并进入拖拽图像模式
        if (!foundSelection) {
          setSelectedMeasurementId(null);
          setSelectedPointIndex(null);
          setSelectionType(null);
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

          // T1 Tilt 特殊处理
          if (selectedTool.includes('t1-tilt')) {
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setT1TiltHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setT1TiltHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('t1-slope')) {
            // T1 Slope 特殊处理（侧位）
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setT1TiltHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setT1TiltHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('ca')) {
            // CA 特殊处理
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setCaHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setCaHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('pelvic')) {
            // Pelvic 特殊处理
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setPelvicHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setPelvicHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('sacral')) {
            // Sacral 特殊处理
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setSacralHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setSacralHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('ss')) {
            // SS（骶骨倾斜角）特殊处理 - 侧位
            if (newPoints.length === 1) {
              // 第一个点：设置水平参考线位置
              setSsHorizontalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setSsHorizontalLine(null); // 清除水平参考线
              }
            }
          } else if (selectedTool.includes('sva')) {
            // SVA（矢状面垂直轴）特殊处理
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setSvaFirstVerticalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setSvaFirstVerticalLine(null); // 清除第一条垂直线
              }
            }
          } else if (selectedTool.includes('avt')) {
            // AVT 特殊处理 - 两条垂直线的距离测量
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setAvtFirstVerticalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setAvtFirstVerticalLine(null); // 清除第一条垂直线
              }
            }
          } else if (selectedTool.includes('ts')) {
            // TS 特殊处理 - 两条垂直线的距离测量
            if (newPoints.length === 1) {
              // 第一个点：设置第一条垂直线位置
              setTsFirstVerticalLine(imagePoint);
            } else if (newPoints.length === 2) {
              // 第二个点：完成测量
              const currentTool = tools.find(t => t.id === selectedTool);
              if (currentTool) {
                onMeasurementAdd(currentTool.name, newPoints);
                setClickedPoints([]);
                setTsFirstVerticalLine(null); // 清除第一条垂直线
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
      const hoverRadius = 10; // 屏幕像素，与其他标注点保持一致
      let foundHover = false;
      
      for (let i = 0; i < standardDistancePoints.length; i++) {
        const point = standardDistancePoints[i];
        const pointScreen = imageToScreen(point);
        const distance = Math.sqrt(
          Math.pow(x - pointScreen.x, 2) + Math.pow(y - pointScreen.y, 2)
        );
        
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

    // 处理选中对象的拖拽
    if ((selectedMeasurementId || selectedPointIndex !== null) && selectedTool === 'hand' && e.buttons === 1) {
      const imagePoint = screenToImage(x, y);
      
      // 如果还没开始拖拽,检查鼠标是否在边界框内
      if (!isDraggingSelection) {
        let canDrag = false;
        
        if (selectedMeasurementId) {
          const measurement = measurements.find(m => m.id === selectedMeasurementId);
          if (measurement && measurement.points.length > 0) {
            // 使用与蓝色选中框相同的边界框计算逻辑
            let minX: number, maxX: number, minY: number, maxY: number;
            
            // 针对不同类型的图形计算不同的边界框（与选中框渲染逻辑一致）
            if (selectionType === 'whole') {
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
        } else if (selectedPointIndex !== null && clickedPoints[selectedPointIndex]) {
          // 对于单个点,始终允许拖拽
          canDrag = true;
        }
        
        if (canDrag) {
          setIsDraggingSelection(true);
        }
        // 如果不能拖拽,不执行任何操作,让其他鼠标处理逻辑处理
      }
      
      // 如果已经在拖拽状态,继续拖拽(无论鼠标是否在边界框内)
      if (isDraggingSelection || selectedMeasurementId || selectedPointIndex !== null) {
        if (selectedMeasurementId) {
          const measurement = measurements.find(m => m.id === selectedMeasurementId);
          if (measurement && measurement.points.length > 0) {
            
            if (selectionType === 'point' && selectedPointIndex !== null) {
              // 移动单个点
              const newPointX = imagePoint.x - dragOffset.x;
              const newPointY = imagePoint.y - dragOffset.y;
              
              const updatedMeasurements = measurements.map(m => {
                if (m.id === selectedMeasurementId) {
                  const updatedMeasurement = {
                    ...m,
                    points: m.points.map((p, idx) => 
                      idx === selectedPointIndex ? { x: newPointX, y: newPointY } : p
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
              const newCenterX = imagePoint.x - dragOffset.x;
              const newCenterY = imagePoint.y - dragOffset.y;
              
              // 计算偏移量
              const deltaX = newCenterX - currentCenterX;
              const deltaY = newCenterY - currentCenterY;
              
              // 更新所有点的位置
              const updatedMeasurements = measurements.map(m => {
                if (m.id === selectedMeasurementId) {
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
        } else if (selectedPointIndex !== null) {
          // 移动单个点
          const newPoints = [...clickedPoints];
          const newPoint = { 
            x: imagePoint.x - dragOffset.x, 
            y: imagePoint.y - dragOffset.y 
          };
          newPoints[selectedPointIndex] = newPoint;
          setClickedPoints(newPoints);
          
          // T1 Tilt 特殊处理：第一个点移动时，水平参考线跟随移动
          if (selectedTool.includes('t1-tilt') && selectedPointIndex === 0 && t1TiltHorizontalLine) {
            setT1TiltHorizontalLine(newPoint);
          }
        }
      }
    } else if (adjustMode === 'zoom' && isDragging && selectedTool === 'hand') {
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

    // 在移动模式下，且没有正在拖拽时，检测悬浮高亮（即使有选中元素也允许悬浮预览）
    if (selectedTool === 'hand' && !isDraggingSelection && !isDragging && !drawingState.isDrawing) {
      // 计算点和线的hover阈值（屏幕像素距离）
      const screenPoint = { x, y };
      const pointHoverRadius = 10; // 屏幕像素
      const lineHoverRadius = 8; // 屏幕像素
      
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
              // 多边形：检查是否悬浮在任意一条边上（使用屏幕坐标）
              for (let i = 0; i < measurement.points.length; i++) {
                const currentScreen = imageToScreen(measurement.points[i]);
                const nextScreen = imageToScreen(measurement.points[(i + 1) % measurement.points.length]);
                
                // 辅助函数: 计算点到线段的距离（屏幕坐标）
                const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
                  const dx = lineEnd.x - lineStart.x;
                  const dy = lineEnd.y - lineStart.y;
                  const lengthSquared = dx * dx + dy * dy;
                  
                  if (lengthSquared === 0) {
                    return Math.sqrt(
                      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
                    );
                  }
                  
                  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
                  t = Math.max(0, Math.min(1, t));
                  
                  const projX = lineStart.x + t * dx;
                  const projY = lineStart.y + t * dy;
                  
                  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
                };
                
                const distToEdge = pointToLineDistance(screenPoint, currentScreen, nextScreen);
                
                if (distToEdge < lineHoverRadius) {
                  hoveredMeasurementId = measurement.id;
                  hoveredElementType = 'whole';
                  foundHover = true;
                  break;
                }
              }
            } else if (measurement.type === '箭头标注' && measurement.points.length >= 2) {
              // 箭头：检查是否悬浮在箭头线段上（使用屏幕坐标）
              const startScreen = imageToScreen(measurement.points[0]);
              const endScreen = imageToScreen(measurement.points[1]);
              
              // 辅助函数: 计算点到线段的距离（屏幕坐标）
              const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
                const dx = lineEnd.x - lineStart.x;
                const dy = lineEnd.y - lineStart.y;
                const lengthSquared = dx * dx + dy * dy;
                
                if (lengthSquared === 0) {
                  return Math.sqrt(
                    Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
                  );
                }
                
                let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
                t = Math.max(0, Math.min(1, t));
                
                const projX = lineStart.x + t * dx;
                const projY = lineStart.y + t * dy;
                
                return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
              };
              
              const distToLine = pointToLineDistance(screenPoint, startScreen, endScreen);
              
              if (distToLine < lineHoverRadius) {
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
            
            // 文字尺寸估算（屏幕像素，fontSize=14）
            const textContent = `${measurement.type}: ${measurement.value}`;
            const fontSize = 14;
            const padding = 4;
            const textWidth = textContent.length * fontSize * 0.6 + padding * 2;
            const textHeight = fontSize * 1.4 + padding * 2;
            
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

      // 更新悬浮状态
      setHoveredMeasurementId(hoveredMeasurementId);
      setHoveredPointIndex(hoveredPointIdx);
      setHoveredElementType(hoveredElementType);
    } else {
      // 清除悬浮状态
      setHoveredMeasurementId(null);
      setHoveredPointIndex(null);
      setHoveredElementType(null);
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
    
    // 结束拖拽选中对象
    if (isDraggingSelection) {
      setIsDraggingSelection(false);
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

  const handleWheel = (e: React.WheelEvent) => {
    if (isHovering) {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, imageScale * delta));
      setImageScale(newScale);
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
        const newScale = Math.max(0.1, Math.min(5, imageScale * delta));
        setImageScale(newScale);
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
      container.removeEventListener('wheel', handleWheelEvent as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovering, imageScale]);

  const resetView = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setClickedPoints([]);
    // 不改变当前选中的工具
  };

  const clearCurrentMeasurement = () => {
    setClickedPoints([]);
    // 清除T1 tilt的水平参考线
    if (selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) {
      setT1TiltHorizontalLine(null);
    }
    // 清除SS的水平参考线
    if (selectedTool.includes('ss')) {
      setSsHorizontalLine(null);
    }
    // 清除SVA的垂直参考线
    if (selectedTool.includes('sva')) {
      setSvaFirstVerticalLine(null);
    }
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
                    // 判断当前测量是否被选中或悬浮
                    const isSelected = selectedMeasurementId === measurement.id;
                    const isHovered = !isSelected && hoveredMeasurementId === measurement.id;
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
                            setHoveredMeasurementId(measurement.id);
                            setHoveredElementType('whole');
                            setHoveredPointIndex(null);
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setHoveredMeasurementId(null);
                            setHoveredElementType(null);
                            setHoveredPointIndex(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTool === 'hand') {
                              if (selectedMeasurementId === measurement.id) {
                                // 如果已选中，则取消选中
                                setSelectedMeasurementId(null);
                                setSelectionType(null);
                                setSelectedPointIndex(null);
                              } else {
                                // 选中该测量
                                setSelectedMeasurementId(measurement.id);
                                setSelectionType('whole');
                                setSelectedPointIndex(null);
                              }
                            }
                          }}
                        >
                          <span className={`truncate mr-2 font-medium ${
                            isSelected ? 'text-white' : isHovered ? 'text-yellow-300' : 'text-white/90'
                          }`}>
                            {measurement.type}
                          </span>
                          <span className={`font-mono whitespace-nowrap ${
                            isSelected ? 'text-white' : isHovered ? 'text-yellow-200' : 'text-yellow-400'
                          }`}>
                            {measurement.value}
                          </span>
                        </div>
                        
                        {/* 右侧删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMeasurementsUpdate(measurements.filter(m => m.id !== measurement.id));
                            // 如果删除的是选中项，清除选中状态
                            if (selectedMeasurementId === measurement.id) {
                              setSelectedMeasurementId(null);
                              setSelectionType(null);
                              setSelectedPointIndex(null);
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
            onClick={() => setImageScale(Math.max(0.1, imageScale * 0.8))}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="缩小 (快捷键: -)"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-8 text-center">
            {Math.round(imageScale * 100)}%
          </span>
          <button
            onClick={() => setImageScale(Math.min(5, imageScale * 1.2))}
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
            onClick={() => setContrast(Math.max(-100, contrast - 5))}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低对比度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(contrast)}
          </span>
          <button
            onClick={() => setContrast(Math.min(100, contrast + 5))}
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
            onClick={() => setBrightness(Math.max(-100, brightness - 5))}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
            title="降低亮度"
          >
            −
          </button>
          <span className="text-white text-xs font-bold w-6 text-center">
            {Math.round(brightness)}
          </span>
          <button
            onClick={() => setBrightness(Math.min(100, brightness + 5))}
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
              const isMeasurementHovered = hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
              return renderHovered ? isMeasurementHovered : !isMeasurementHovered;
            })
            .map((measurement, index) => {
          // 判断是否为辅助图形(不需要标识)
          const isAuxiliaryShape = checkIsAuxiliaryShape(measurement.type);
          
          // 使用配置中的颜色
          const color = getColorForType(measurement.type);
          
          // 将图像坐标转换为屏幕坐标
          const screenPoints = measurement.points.map(p => imageToScreen(p));
          // 检查整个测量是否为选中或悬浮状态
          const isMeasurementSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
          const isMeasurementHovered = !isMeasurementSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
          
          // 根据状态确定颜色
          const displayColor = isMeasurementSelected ? "#ef4444" : isMeasurementHovered ? "#fbbf24" : color;
          
          return (
            <g key={measurement.id}>
              {/* 关键点 - 辅助图形不显示定位点 */}
              {!isAuxiliaryShape && screenPoints.map((point, pointIndex) => {
                // 检查是否为选中状态
                const isSelected = selectedMeasurementId === measurement.id && 
                  ((selectionType === 'point' && selectedPointIndex === pointIndex) ||
                   (selectionType === 'whole'));
                
                // 检查是否为悬浮高亮状态（只有在非选中状态下才显示悬浮）
                const isHovered = !isSelected && hoveredMeasurementId === measurement.id && 
                  ((hoveredElementType === 'point' && hoveredPointIndex === pointIndex) ||
                   (hoveredElementType === 'whole'));
                
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
              
              {/* 测量值标注 - 显示在测量线中间,辅助图形不显示 */}
              {!isAuxiliaryShape && screenPoints.length >= 2 && !hideAllLabels && !hiddenMeasurementIds.has(measurement.id) && (() => {
                const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
                const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
                
                // 使用配置文件中的标注位置计算函数 - 传入图像坐标，返回图像坐标
                const labelPosInImage = getLabelPositionForType(measurement.type, measurement.points, imageScale);
                // 转换为屏幕坐标
                const labelPosInScreen = imageToScreen(labelPosInImage);
                const textX = labelPosInScreen.x;
                const textY = labelPosInScreen.y;
                
                const textContent = `${measurement.type}: ${measurement.value}`;
                const fontSize = isHovered ? 16 : 14;
                // 估算文字宽度和高度
                const textWidth = textContent.length * fontSize * 0.6;
                const textHeight = fontSize * 1.4;
                const padding = 4;
                
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
          const isHovered = !hoveredMeasurementId && hoveredElementType === 'point' && hoveredPointIndex === index;
          
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
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          
          // 计算线段的角度和长度
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const length = Math.sqrt(dx * dx + dy * dy);
          
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

        {/* T1 Tilt 专用水平参考线 HRL */}
        {(selectedTool.includes('t1-tilt') || selectedTool.includes('t1-slope')) && t1TiltHorizontalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(t1TiltHorizontalLine);
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

        {/* CA 专用水平参考线 HRL */}
        {selectedTool.includes('ca') && caHorizontalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(caHorizontalLine);
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

        {/* Pelvic 专用水平参考线 HRL */}
        {selectedTool.includes('pelvic') && pelvicHorizontalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(pelvicHorizontalLine);
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

        {/* SS（骶骨倾斜角）专用水平参考线 HRL - 侧位 */}
        {selectedTool.includes('ss') && ssHorizontalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(ssHorizontalLine);
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

        {/* Sacral 专用水平参考线 HRL */}
        {selectedTool.includes('sacral') && sacralHorizontalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(sacralHorizontalLine);
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

        {/* AVT 专用第一条垂直辅助线 */}
        {selectedTool.includes('avt') && avtFirstVerticalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(avtFirstVerticalLine);
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

        {/* TS 专用第一条垂直辅助线 */}
        {selectedTool.includes('ts') && tsFirstVerticalLine && (
          <>
            {(() => {
              const referencePoint = imageToScreen(tsFirstVerticalLine);
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
              const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
              const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
              
              return (
                <circle
                  key={measurement.id}
                  cx={screenCenter.x}
                  cy={screenCenter.y}
                  r={radius}
                  fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                  fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#3b82f6"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.6"}
                />
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
              const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
              const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
              
              return (
                <ellipse
                  key={measurement.id}
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
              const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
              const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
              
              return (
                <rect
                  key={measurement.id}
                  x={Math.min(topLeft.x, bottomRight.x)}
                  y={Math.min(topLeft.y, bottomRight.y)}
                  width={Math.abs(bottomRight.x - topLeft.x)}
                  height={Math.abs(bottomRight.y - topLeft.y)}
                  fill={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "none"}
                  fillOpacity={isSelected ? "0.1" : isHovered ? "0.1" : "0"}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#ec4899"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  opacity={isSelected || isHovered ? "1" : "0.6"}
                />
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
              const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
              const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
              
              // 确定箭头头部的marker
              let markerEnd = "url(#arrowhead-normal)";
              if (isSelected) {
                markerEnd = "url(#arrowhead-selected)";
              } else if (isHovered) {
                markerEnd = "url(#arrowhead-hovered)";
              }
              
              return (
                <line
                  key={measurement.id}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isSelected ? "#ef4444" : isHovered ? "#fbbf24" : "#f59e0b"}
                  strokeWidth={isSelected ? "3" : isHovered ? "3" : "2"}
                  markerEnd={markerEnd}
                  opacity={isSelected || isHovered ? "1" : "0.6"}
                />
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
            const isSelected = selectedMeasurementId === measurement.id && selectionType === 'whole';
            const isHovered = !isSelected && hoveredMeasurementId === measurement.id && hoveredElementType === 'whole';
            
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

        {/* 选中边界框和删除按钮 */}
        {(() => {
          // 获取选中的对象
          let selectedPoints: Point[] = [];
          let selectedMeasurement: any = null;
          
          if (selectedMeasurementId) {
            // 选中了测量结果
            const measurement = measurements.find(m => m.id === selectedMeasurementId);
            if (measurement) {
              selectedMeasurement = measurement;
              if (selectionType === 'point' && selectedPointIndex !== null) {
                // 只显示选中的点
                selectedPoints = [measurement.points[selectedPointIndex]];
              } else {
                // 显示整个测量结果
                selectedPoints = measurement.points;
              }
            }
          } else if (selectedPointIndex !== null && clickedPoints[selectedPointIndex]) {
            // 选中了单个点
            selectedPoints = [clickedPoints[selectedPointIndex]];
          }
          
          if (selectedPoints.length === 0) return null;
          
          // 计算边界框
          let minX: number, maxX: number, minY: number, maxY: number;
          
          // 针对不同类型的图形计算不同的边界框
          if (selectedMeasurement && selectionType === 'whole') {
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
            <p className="font-medium">移动模式</p>
            <p>点击选中标注 | 拖拽移动 | 点击删除按钮删除</p>
            <p className="text-gray-400 mt-1">或拖拽移动图像 | 滚轮缩放</p>
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
    </div>
  );
}
