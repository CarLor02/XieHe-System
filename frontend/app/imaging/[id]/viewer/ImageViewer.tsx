'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createAuthenticatedClient } from '../../../../store/authStore';

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
        // 将IMG004格式转换为数字ID：IMG004 -> 4
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/studies/${numericId}`);
        setStudyData(response.data);
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

  // 构建兼容的imageData对象
  const imageData = studyData
    ? {
        id: imageId,
        patientName: studyData.patient_name,
        patientId: studyData.patient_id.toString(),
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

  // 根据不同影像类型获取专用工具
  const getToolsForExamType = (examType: string) => {
    if (examType === '正位X光片') {
      return [
        {
          id: 't1-tilt',
          name: 'T1 Tilt',
          icon: 'ri-focus-3-line',
          description: 'T1椎体倾斜角测量',
          pointsNeeded: 4,
        },
        {
          id: 'cobb',
          name: 'Cobb',
          icon: 'ri-compass-3-line',
          description: 'Cobb角测量',
          pointsNeeded: 4,
        },
        {
          id: 'rsh',
          name: 'RSH',
          icon: 'ri-contrast-line',
          description: '肩高差测量(Radiographic Shoulder Height)',
          pointsNeeded: 2,
        },
        {
          id: 'pelvic',
          name: 'Pelvic',
          icon: 'ri-triangle-line',
          description: '骨盆倾斜角测量',
          pointsNeeded: 2,
        },
        {
          id: 'sacral',
          name: 'Sacral',
          icon: 'ri-square-line',
          description: '骶骨倾斜角测量',
          pointsNeeded: 4,
        },
        {
          id: 'avt',
          name: 'AVT',
          icon: 'ri-focus-2-line',
          description: '顶椎平移量(Apical Vertebral Translation)',
          pointsNeeded: 3,
        },
        {
          id: 'ts',
          name: 'TS',
          icon: 'ri-crosshair-2-line',
          description: '躯干偏移量(Trunk Shift)',
          pointsNeeded: 3,
        },
        {
          id: 'circle',
          name: 'Auxiliary Circle',
          icon: 'ri-circle-line',
          description: '辅助圆形',
          pointsNeeded: 0,
        },
        {
          id: 'ellipse',
          name: 'Auxiliary Ellipse',
          icon: 'ri-shape-2-line',
          description: '辅助椭圆',
          pointsNeeded: 0,
        },
        {
          id: 'rectangle',
          name: 'Auxiliary Box',
          icon: 'ri-rectangle-line',
          description: '辅助矩形',
          pointsNeeded: 0,
        },
        {
          id: 'arrow',
          name: 'Arrow',
          icon: 'ri-arrow-right-line',
          description: '箭头',
          pointsNeeded: 0,
        },
        {
          id: 'polygon',
          name: 'Polygons',
          icon: 'ri-shape-line',
          description: '多边形',
          pointsNeeded: 0,
        },
      ];
    } else if (examType === '侧位X光片') {
      return [
        {
          id: 't1-slope',
          name: 'T1 Slope',
          icon: 'ri-focus-3-line',
          description: 'T1倾斜角测量',
          pointsNeeded: 4,
        },
        {
          id: 'c2c7-cobb',
          name: 'C2-C7 Cobb',
          icon: 'ri-compass-3-line',
          description: '颈椎Cobb角测量',
          pointsNeeded: 4,
        },
        {
          id: 'tk',
          name: 'TK',
          icon: 'ri-moon-line',
          description: '胸椎后凸角(Thoracic Kyphosis)',
          pointsNeeded: 4,
        },
        {
          id: 'll',
          name: 'LL',
          icon: 'ri-bow-line',
          description: '腰椎前凸角(Lumbar Lordosis)',
          pointsNeeded: 4,
        },
        {
          id: 'sva',
          name: 'SVA',
          icon: 'ri-ruler-line',
          description: '矢状面椎体轴线(Sagittal Vertical Axis)',
          pointsNeeded: 2,
        },
        {
          id: 'pi',
          name: 'PI',
          icon: 'ri-triangle-line',
          description: '骨盆入射角(Pelvic Incidence)',
          pointsNeeded: 3,
        },
        {
          id: 'pt',
          name: 'PT',
          icon: 'ri-triangle-fill',
          description: '骨盆倾斜角(Pelvic Tilt)',
          pointsNeeded: 3,
        },
        {
          id: 'ss',
          name: 'SS',
          icon: 'ri-square-line',
          description: '骶骨倾斜角(Sacral Slope)',
          pointsNeeded: 4,
        },
        {
          id: 'circle',
          name: 'Auxiliary Circle',
          icon: 'ri-circle-line',
          description: '辅助圆形',
          pointsNeeded: 0,
        },
        {
          id: 'ellipse',
          name: 'Auxiliary Ellipse',
          icon: 'ri-shape-2-line',
          description: '辅助椭圆',
          pointsNeeded: 0,
        },
        {
          id: 'rectangle',
          name: 'Auxiliary Box',
          icon: 'ri-rectangle-line',
          description: '辅助矩形',
          pointsNeeded: 0,
        },
        {
          id: 'arrow',
          name: 'Arrow',
          icon: 'ri-arrow-right-line',
          description: '箭头',
          pointsNeeded: 0,
        },
        {
          id: 'polygon',
          name: 'Polygons',
          icon: 'ri-shape-line',
          description: '多边形',
          pointsNeeded: 0,
        },
      ];
    } else {
      return [
        {
          id: 'length',
          name: '长度测量',
          icon: 'ri-ruler-2-line',
          description: '距离测量工具',
          pointsNeeded: 2,
        },
        {
          id: 'angle',
          name: '角度测量',
          icon: 'ri-compass-3-line',
          description: '通用角度测量',
          pointsNeeded: 3,
        },
        {
          id: 'circle',
          name: 'Auxiliary Circle',
          icon: 'ri-circle-line',
          description: '辅助圆形',
          pointsNeeded: 0,
        },
        {
          id: 'ellipse',
          name: 'Auxiliary Ellipse',
          icon: 'ri-shape-2-line',
          description: '辅助椭圆',
          pointsNeeded: 0,
        },
        {
          id: 'rectangle',
          name: 'Auxiliary Box',
          icon: 'ri-rectangle-line',
          description: '辅助矩形',
          pointsNeeded: 0,
        },
        {
          id: 'arrow',
          name: 'Arrow',
          icon: 'ri-arrow-right-line',
          description: '箭头',
          pointsNeeded: 0,
        },
        {
          id: 'polygon',
          name: 'Polygons',
          icon: 'ri-shape-line',
          description: '多边形',
          pointsNeeded: 0,
        },
      ];
    }
  };

  const tools = getToolsForExamType(imageData.examType);

  // 计算函数保持不变
  const calculateAngle = (points: Point[]) => {
    if (points.length < 3) return 0;

    const dx1 = points[1].x - points[0].x;
    const dy1 = points[1].y - points[0].y;
    const dx2 = points[2].x - points[1].x;
    const dy2 = points[2].y - points[1].y;

    const angle1 = Math.atan2(dy1, dx1);
    const angle2 = Math.atan2(dy2, dx2);

    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);
    if (angleDiff > 90) angleDiff = 180 - angleDiff;

    return angleDiff;
  };

  const calculateDistance = (points: Point[]) => {
    if (points.length < 2) return 0;

    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;

    return Math.sqrt(dx * dx + dy * dy) * 0.1;
  };

  const addMeasurement = (type: string, points: Point[] = []) => {
    let defaultValue = '0.0°';
    let description = `新增${type}测量`;

    // 根据不同的测量类型生成合理的默认值
    switch (type) {
      case 'T1 Tilt':
        defaultValue =
          Math.random() > 0.5
            ? `${(Math.random() * 15 + 5).toFixed(1)}°`
            : `-${(Math.random() * 10 + 2).toFixed(1)}°`;
        description = 'T1椎体倾斜角测量';
        break;
      case 'Cobb':
        defaultValue = `${(Math.random() * 40 + 10).toFixed(1)}°`;
        description = 'Cobb角测量';
        break;
      case 'RSH':
        defaultValue = `${(Math.random() * 20 + 5).toFixed(1)}mm`;
        description = '肩高差测量(Radiographic Shoulder Height)';
        break;
      case 'Pelvic':
        defaultValue =
          Math.random() > 0.5
            ? `${(Math.random() * 8 + 2).toFixed(1)}°`
            : `-${(Math.random() * 6 + 1).toFixed(1)}°`;
        description = '骨盆倾斜角测量';
        break;
      case 'Sacral':
        defaultValue = `${(Math.random() * 12 + 8).toFixed(1)}°`;
        description = '骶骨倾斜角测量';
        break;
      case 'AVT':
        defaultValue = `${(Math.random() * 25 + 5).toFixed(1)}mm`;
        description = '顶椎平移量(Apical Vertebral Translation)';
        break;
      case 'TS':
        defaultValue = `${(Math.random() * 30 + 10).toFixed(1)}mm`;
        description = '躯干偏移量(Trunk Shift)';
        break;
      case 'T1 Slope':
        defaultValue = `${(Math.random() * 25 + 15).toFixed(1)}°`;
        description = 'T1倾斜角测量';
        break;
      case 'C2-C7 Cobb':
        defaultValue = `${(Math.random() * 20 + 5).toFixed(1)}°`;
        description = '颈椎Cobb角测量';
        break;
      case 'TK':
        defaultValue = `${(Math.random() * 30 + 20).toFixed(1)}°`;
        description = '胸椎后凸角(Thoracic Kyphosis)';
        break;
      case 'LL':
        defaultValue = `${(Math.random() * 40 + 30).toFixed(1)}°`;
        description = '腰椎前凸角(Lumbar Lordosis)';
        break;
      case 'SVA':
        defaultValue = `${(Math.random() * 60 + 10).toFixed(1)}mm`;
        description = '矢状面椎体轴线(Sagittal Vertical Axis)';
        break;
      case 'PI':
        defaultValue = `${(Math.random() * 30 + 40).toFixed(1)}°`;
        description = '骨盆入射角(Pelvic Incidence)';
        break;
      case 'PT':
        defaultValue = `${(Math.random() * 20 + 10).toFixed(1)}°`;
        description = '骨盆倾斜角(Pelvic Tilt)';
        break;
      case 'SS':
        defaultValue = `${(Math.random() * 25 + 25).toFixed(1)}°`;
        description = '骶骨倾斜角(Sacral Slope)';
        break;
      case '长度测量':
        if (points.length >= 2) {
          const distance = calculateDistance(points);
          defaultValue = `${distance.toFixed(1)}mm`;
        } else {
          defaultValue = `${(Math.random() * 100).toFixed(1)}mm`;
        }
        description = '距离测量工具';
        break;
      case '角度测量':
        if (points.length >= 3) {
          const angle = calculateAngle(points);
          defaultValue = `${angle.toFixed(1)}°`;
        } else {
          defaultValue = `${(Math.random() * 90).toFixed(1)}°`;
        }
        description = '通用角度测量';
        break;
      case '圆形标注':
        defaultValue = '辅助标注';
        description = '圆形辅助标注';
        break;
      case '椭圆标注':
        defaultValue = '辅助标注';
        description = '椭圆辅助标注';
        break;
      case '矩形标注':
        defaultValue = '辅助标注';
        description = '矩形辅助标注';
        break;
      case '箭头标注':
        defaultValue = '辅助标注';
        description = '箭头辅助标注';
        break;
      case '多边形标注':
        defaultValue = '辅助标注';
        description = '多边形辅助标注';
        break;
    }

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
          '/api/v1/studies?page=1&page_size=100'
        );

        if (response.data && response.data.studies) {
          // 从API响应中提取影像ID，格式为IMG{id}
          const ids = response.data.studies.map((study: any) => {
            // 使用study.id来生成影像ID
            return `IMG${study.id.toString().padStart(3, '0')}`;
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

  const generateReport = () => {
    if (measurements.length === 0) {
      setReportText('暂无测量数据，无法生成报告。请先进行相关测量。');
      return;
    }

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
      const rshMeasurement = measurements.find(m => m.type === 'RSH');

      if (cobbMeasurement) {
        const cobbValue = parseFloat(cobbMeasurement.value);
        if (cobbValue > 10) {
          report += `• 脊柱侧弯程度：${cobbValue < 25 ? '轻度' : cobbValue < 40 ? '中度' : '重度'}（Cobb角 ${cobbMeasurement.value}）\n`;
        }
      }

      if (rshMeasurement) {
        const rshValue = parseFloat(rshMeasurement.value);
        if (rshValue > 10) {
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
  };

  // 获取当前工具
  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

  // 加载测量数据 - 异步加载，不阻止图像显示
  useEffect(() => {
    loadMeasurements();
  }, [imageId]);

  const loadMeasurements = async () => {
    setIsMeasurementsLoading(true);
    try {
      const client = createAuthenticatedClient();
      const response = await client.get(`/api/v1/measurements/${imageId}`);
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
      const measurementData = {
        imageId: imageId,
        patientId: imageData.patientId,
        examType: imageData.examType,
        measurements: measurements,
        reportText: reportText,
        savedAt: new Date().toISOString(),
      };

      const response = await client.post(
        `/api/v1/measurements/${imageId}`,
        measurementData
      );

      if (response.status === 200) {
        setSaveMessage('测量数据保存成功');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存测量数据失败:', error);
      setSaveMessage('保存测量数据失败，请重试');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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

            <button
              onClick={saveMeasurements}
              disabled={isSaving || measurements.length === 0}
              className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <i className="ri-loader-line w-4 h-4 flex items-center justify-center animate-spin"></i>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <i className="ri-save-line w-4 h-4 flex items-center justify-center"></i>
                  <span>保存测量</span>
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
            />
          </div>
        </div>

        {/* 右侧工具栏 */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
          {/* 工具选择区 */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
            <h3 className="font-semibold text-white mb-3">
              测量工具 - {imageData.examType}
            </h3>

            {/* 横向工具栏 */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {/* 手工具 */}
                <button
                  onClick={() => setSelectedTool('hand')}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[60px] h-16 transition-all ${
                    selectedTool === 'hand'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="移动工具"
                >
                  <i className="ri-hand-line w-5 h-5 flex items-center justify-center mb-1"></i>
                  <span className="text-xs">移动</span>
                  {selectedTool === 'hand' && (
                    <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -right-1 bg-blue-500 rounded-full"></i>
                  )}
                </button>

                {/* 专用测量工具 */}
                {tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[60px] h-16 transition-all relative ${
                      selectedTool === tool.id
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={`${tool.description} (需要标注${tool.pointsNeeded}个点)`}
                  >
                    <i
                      className={`${tool.icon} w-5 h-5 flex items-center justify-center mb-1`}
                    ></i>
                    <span className="text-xs text-center leading-tight">
                      {tool.name}
                    </span>
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

            {/* 标准距离设置按钮 */}
            <div className="mb-4">
              <button
                onClick={() =>
                  setShowStandardDistancePanel(!showStandardDistancePanel)
                }
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <i className="ri-ruler-line w-4 h-4"></i>
                <span>标准距离设置</span>
              </button>

              {/* 标准距离设置面板 */}
              {showStandardDistancePanel && (
                <div className="mt-2 bg-gray-700/50 rounded-lg p-3">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-300">
                      输入标准参考距离 (mm):
                    </label>
                    <input
                      type="number"
                      value={standardDistanceValue}
                      onChange={e => setStandardDistanceValue(e.target.value)}
                      placeholder="例如: 100"
                      className="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-purple-400 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const value = parseFloat(standardDistanceValue);
                        if (!isNaN(value) && value > 0) {
                          setStandardDistance(value);
                          setStandardDistanceValue('');
                          setShowStandardDistancePanel(false);
                        }
                      }}
                      className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                    >
                      保存
                    </button>
                    {standardDistance !== null && (
                      <div className="text-xs text-green-400 mt-2">
                        ✓ 已设置: {standardDistance}mm
                      </div>
                    )}
                  </div>
                </div>
              )}
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

            {/* 当前选中工具信息 */}
            {selectedTool !== 'hand' && currentTool && (
              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <i
                    className={`${currentTool.icon} w-4 h-4 flex items-center justify-center text-blue-400`}
                  ></i>
                  <span className="text-white font-medium text-sm">
                    {currentTool.name}
                  </span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {currentTool.description}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <span className="text-gray-400">
                    需要标注:{' '}
                    <span className="text-yellow-400">
                      {currentTool.pointsNeeded}个点
                    </span>
                  </span>
                  {clickedPoints.length > 0 && (
                    <span className="text-blue-400">
                      已标注: {clickedPoints.length}/{currentTool.pointsNeeded}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 测量结果列表 */}
            <div className="max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">测量结果</h4>
                {isMeasurementsLoading ? (
                  <span className="text-xs text-blue-400 flex items-center space-x-1">
                    <i className="ri-loader-line w-3 h-3 flex items-center justify-center animate-spin"></i>
                    <span>加载中...</span>
                  </span>
                ) : measurements.length > 0 ? (
                  <span className="text-xs text-gray-400">
                    ({measurements.length}项)
                  </span>
                ) : null}
              </div>
              {measurements.length > 0 ? (
                <div className="space-y-2">
                  {measurements.map(measurement => (
                    <div
                      key={measurement.id}
                      className="flex items-center justify-between bg-gray-700/30 rounded px-2 py-1"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-xs font-medium">
                          {measurement.type}
                        </span>
                        <div className="text-yellow-400 text-xs font-mono">
                          {measurement.value}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMeasurement(measurement.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <i className="ri-close-line w-3 h-3 flex items-center justify-center"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">暂无测量数据</p>
              )}
            </div>
          </div>

          {/* 诊断报告区 */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <h4 className="font-semibold text-white mb-3 text-sm">测量报告</h4>
            <textarea
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              placeholder={`请输入 ${imageData.examType}的测量分析和诊断意见...\n\n或点击"生成报告"按钮自动生成测量报告`}
              className="flex-1 p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm placeholder-gray-400 min-h-[120px]"
              maxLength={500}
            ></textarea>

            <div className="flex space-x-2 mt-4 flex-shrink-0">
              <button
                onClick={goToPreviousImage}
                disabled={currentIndex <= 0}
                className="flex-1 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一张
              </button>
              <button
                onClick={goToNextImage}
                disabled={currentIndex >= imageList.length - 1}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一张
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
}) {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showResults, setShowResults] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

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

  // 选中状态 - 用于移动模式下的选中、拖拽和删除
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();

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
  // 图像使用 transform: translate(pos) scale(s)，transformOrigin: center
  const imageToScreen = (point: Point): Point => {
    // 获取容器中心点
    const container = document.querySelector('[data-image-canvas]');
    if (!container) {
      return {
        x: point.x * imageScale + imagePosition.x,
        y: point.y * imageScale + imagePosition.y,
      };
    }
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // CSS transform 顺序：先 scale（以 center 为原点），再 translate
    // 点相对于中心的坐标
    const relX = point.x;
    const relY = point.y;
    
    // 应用缩放
    const scaledX = relX * imageScale;
    const scaledY = relY * imageScale;
    
    // 应用平移，并加上容器中心
    return {
      x: scaledX + imagePosition.x + centerX,
      y: scaledY + imagePosition.y + centerY,
    };
  };

  // 坐标转换函数：将屏幕坐标系转换为图像坐标系
  const screenToImage = (screenX: number, screenY: number): Point => {
    // 获取容器中心点
    const container = document.querySelector('[data-image-canvas]');
    if (!container) {
      return {
        x: (screenX - imagePosition.x) / imageScale,
        y: (screenY - imagePosition.y) / imageScale,
      };
    }
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // 逆向转换：先减去容器中心和平移，再除以缩放
    const translatedX = screenX - centerX - imagePosition.x;
    const translatedY = screenY - centerY - imagePosition.y;
    
    return {
      x: translatedX / imageScale,
      y: translatedY / imageScale,
    };
  };

  // 获取图像数据
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setImageLoading(true);
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';

        // 使用fetch API直接获取，确保认证头被正确传递
        const { accessToken } =
          require('../../../../store/authStore').useAuthStore.getState();

        const response = await fetch(`/api/v1/upload/files/${numericId}`, {
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
          
          const firstPoint = measurement.points[0];
          const lastPoint = measurement.points[measurement.points.length - 1];
          const textX = (firstPoint.x + lastPoint.x) / 2;
          const textY = (firstPoint.y + lastPoint.y) / 2 - 10 / imageScale;
          
          // 估算文字宽度和高度 (粗略估算)
          const textWidth = (measurement.type.length + measurement.value.length) * 8 / imageScale;
          const textHeight = 20 / imageScale;
          
          return point.x >= textX - textWidth / 2 && point.x <= textX + textWidth / 2 &&
                 point.y >= textY - textHeight / 2 && point.y <= textY + textHeight / 2;
        };
        
        // 先检查是否点击了已有的测量结果或点
        let foundSelection = false;
        let selectedMeasurement: any = null;
        
        // 1. 检查是否点击了已完成的测量结果
        for (const measurement of measurements) {
          const clickThreshold = 10 / imageScale; // 点击阈值
          
          // 1.1 检查是否点击了任意点
          for (let i = 0; i < measurement.points.length; i++) {
            const point = measurement.points[i];
            const distance = Math.sqrt(
              Math.pow(imagePoint.x - point.x, 2) + Math.pow(imagePoint.y - point.y, 2)
            );
            if (distance < clickThreshold) {
              selectedMeasurement = measurement;
              foundSelection = true;
              break;
            }
          }
          
          // 1.2 检查是否点击了连接线
          if (!foundSelection && measurement.points.length >= 2) {
            for (let i = 0; i < measurement.points.length - 1; i++) {
              const dist = pointToLineDistance(
                imagePoint,
                measurement.points[i],
                measurement.points[i + 1]
              );
              if (dist < clickThreshold) {
                selectedMeasurement = measurement;
                foundSelection = true;
                break;
              }
            }
          }
          
          // 1.3 检查是否点击了文字标识区域或辅助图形内部区域
          if (!foundSelection) {
            const isAuxiliaryShape = ['圆形标注', '椭圆标注', '矩形标注', '箭头标注', '多边形标注'].includes(measurement.type);
            
            if (isAuxiliaryShape) {
              // 辅助图形:检查是否点击了图形内部或边界
              if (measurement.type === '圆形标注' && measurement.points.length === 2) {
                // 圆形:检查是否在圆内
                const center = measurement.points[0];
                const edge = measurement.points[1];
                const radius = Math.sqrt(
                  Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
                );
                const distToCenter = Math.sqrt(
                  Math.pow(imagePoint.x - center.x, 2) + Math.pow(imagePoint.y - center.y, 2)
                );
                if (distToCenter <= radius) {
                  selectedMeasurement = measurement;
                  foundSelection = true;
                }
              } else if (measurement.type === '椭圆标注' && measurement.points.length === 2) {
                // 椭圆:检查是否在椭圆内
                const p1 = measurement.points[0];
                const p2 = measurement.points[1];
                const centerX = (p1.x + p2.x) / 2;
                const centerY = (p1.y + p2.y) / 2;
                const a = Math.abs(p2.x - p1.x) / 2; // 长半轴
                const b = Math.abs(p2.y - p1.y) / 2; // 短半轴
                if (a > 0 && b > 0) {
                  const normalizedDist = 
                    Math.pow((imagePoint.x - centerX) / a, 2) + 
                    Math.pow((imagePoint.y - centerY) / b, 2);
                  if (normalizedDist <= 1) {
                    selectedMeasurement = measurement;
                    foundSelection = true;
                  }
                }
              } else if (measurement.type === '矩形标注' && measurement.points.length === 2) {
                // 矩形:检查是否在矩形内
                const p1 = measurement.points[0];
                const p2 = measurement.points[1];
                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);
                const minY = Math.min(p1.y, p2.y);
                const maxY = Math.max(p1.y, p2.y);
                if (imagePoint.x >= minX && imagePoint.x <= maxX &&
                    imagePoint.y >= minY && imagePoint.y <= maxY) {
                  selectedMeasurement = measurement;
                  foundSelection = true;
                }
              } else if (measurement.type === '多边形标注' && measurement.points.length >= 3) {
                // 多边形:使用射线法检查点是否在多边形内
                let inside = false;
                for (let i = 0, j = measurement.points.length - 1; i < measurement.points.length; j = i++) {
                  const xi = measurement.points[i].x, yi = measurement.points[i].y;
                  const xj = measurement.points[j].x, yj = measurement.points[j].y;
                  const intersect = ((yi > imagePoint.y) !== (yj > imagePoint.y))
                    && (imagePoint.x < (xj - xi) * (imagePoint.y - yi) / (yj - yi) + xi);
                  if (intersect) inside = !inside;
                }
                if (inside) {
                  selectedMeasurement = measurement;
                  foundSelection = true;
                }
              }
              // 箭头标注已经通过线段检测(1.2)处理,无需额外逻辑
            } else {
              // 非辅助图形:检查文字标识区域
              if (isPointInTextLabel(imagePoint, measurement)) {
                selectedMeasurement = measurement;
                foundSelection = true;
              }
            }
          }
          
          if (foundSelection) {
            // 计算拖拽偏移量 - 使用边界框中心点
            const xs = selectedMeasurement.points.map((p: Point) => p.x);
            const ys = selectedMeasurement.points.map((p: Point) => p.y);
            const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
            const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
            
            setSelectedMeasurementId(selectedMeasurement.id);
            setSelectedPointIndex(null);
            setIsDraggingSelection(false); // 初始不拖拽,点击时只选中
            setDragOffset({
              x: imagePoint.x - centerX,
              y: imagePoint.y - centerY,
            });
            break;
          }
        }
        
        // 2. 检查是否点击了正在绘制的点
        if (!foundSelection && clickedPoints.length > 0) {
          const clickThreshold = 10 / imageScale;
          for (let i = 0; i < clickedPoints.length; i++) {
            const point = clickedPoints[i];
            const distance = Math.sqrt(
              Math.pow(imagePoint.x - point.x, 2) + Math.pow(imagePoint.y - point.y, 2)
            );
            if (distance < clickThreshold) {
              setSelectedMeasurementId(null);
              setSelectedPointIndex(i);
              setIsDraggingSelection(false); // 初始不拖拽
              setDragOffset({
                x: imagePoint.x - point.x,
                y: imagePoint.y - point.y,
              });
              foundSelection = true;
              break;
            }
          }
        }
        
        // 3. 如果没有点击到任何对象,检查是否点击了已选中对象的边界框内
        if (!foundSelection && selectedMeasurementId) {
          const measurement = measurements.find(m => m.id === selectedMeasurementId);
          if (measurement && measurement.points.length > 0) {
            // 计算边界框
            const xs = measurement.points.map(p => p.x);
            const ys = measurement.points.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const padding = 15 / imageScale;
            
            // 检查是否在边界框内
            if (imagePoint.x >= minX - padding && imagePoint.x <= maxX + padding &&
                imagePoint.y >= minY - padding && imagePoint.y <= maxY + padding) {
              // 在边界框内,保持选中状态并重新计算拖拽偏移量
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;
              setDragOffset({
                x: imagePoint.x - centerX,
                y: imagePoint.y - centerY,
              });
              foundSelection = true;
            }
          }
        }
        
        // 4. 如果没有点击到任何对象且不在已选中对象的边界框内,则取消选中并进入拖拽图像模式
        if (!foundSelection) {
          setSelectedMeasurementId(null);
          setSelectedPointIndex(null);
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

          // 如果点数达到所需数量，自动生成测量
          const currentTool = tools.find(t => t.id === selectedTool);
          if (currentTool && newPoints.length === currentTool.pointsNeeded) {
            onMeasurementAdd(currentTool.name, newPoints);
            const emptyPoints: Point[] = [];
            setClickedPoints(emptyPoints);
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
            // 计算边界框
            const xs = measurement.points.map(p => p.x);
            const ys = measurement.points.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const padding = 15 / imageScale;
            
            // 检查鼠标是否在边界框内
            if (imagePoint.x >= minX - padding && imagePoint.x <= maxX + padding &&
                imagePoint.y >= minY - padding && imagePoint.y <= maxY + padding) {
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
          // 移动整个测量结果 - 使用中心点计算偏移
          const measurement = measurements.find(m => m.id === selectedMeasurementId);
          if (measurement && measurement.points.length > 0) {
            // 计算当前中心点
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
                return {
                  ...m,
                  points: m.points.map(p => ({
                    x: p.x + deltaX,
                    y: p.y + deltaY,
                  })),
                };
              }
              return m;
            });
            
            onMeasurementsUpdate(updatedMeasurements);
          }
        } else if (selectedPointIndex !== null) {
          // 移动单个点
          const newPoints = [...clickedPoints];
          newPoints[selectedPointIndex] = { 
            x: imagePoint.x - dragOffset.x, 
            y: imagePoint.y - dragOffset.y 
          };
          setClickedPoints(newPoints);
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
  };

  const completePolygon = () => {
    if (clickedPoints.length >= 3) {
      onMeasurementAdd('多边形标注', clickedPoints);
      setClickedPoints([]);
    }
  };

  const handleMouseUp = () => {
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
  };

  const getCursorStyle = () => {
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
    >
      {/* 左上角测量结果展示区 */}
      <div 
        className="absolute top-4 left-48 z-10"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-black/20">
            <span className="text-white text-xs font-medium">测量结果</span>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-white/80 hover:text-white p-0.5"
            >
              <i
                className={`${showResults ? 'ri-eye-close-line' : 'ri-eye-line'} w-3 h-3 flex items-center justify-center`}
              ></i>
            </button>
          </div>

          {showResults && (
            <div className="max-w-48 max-h-64 overflow-y-auto">
              {measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {measurements.map(measurement => (
                    <div
                      key={measurement.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-white/90 truncate mr-2">
                        {measurement.type}
                      </span>
                      <span className="text-yellow-400 font-mono whitespace-nowrap">
                        {measurement.value}
                      </span>
                    </div>
                  ))}
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
            onClick={handleClear}
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
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
          </marker>
        </defs>
        {/* 绘制已完成的测量 */}
        {measurements.map((measurement, index) => {
          // 判断是否为辅助图形(不需要标识)
          const isAuxiliaryShape = ['圆形标注', '椭圆标注', '矩形标注', '箭头标注', '多边形标注'].includes(measurement.type);
          
          // 根据测量类型分配颜色
          const getMeasurementColor = (type: string): string => {
            // 角度测量类
            if (type.includes('Cobb') || type === 'Cobb') return '#3b82f6'; // 蓝色
            if (type.includes('Tilt') || type === 'T1 Tilt') return '#8b5cf6'; // 紫色
            if (type.includes('Slope') || type === 'T1 Slope') return '#a855f7'; // 亮紫色
            if (type.includes('Pelvic') || type === 'Pelvic') return '#ec4899'; // 粉色
            if (type.includes('Sacral') || type === 'Sacral') return '#f43f5e'; // 玫红色
            if (type === 'PI') return '#ef4444'; // 红色 - 骨盆入射角
            if (type === 'PT') return '#f97316'; // 橙红色 - 骨盆倾斜角
            if (type === 'SS') return '#f59e0b'; // 橙色 - 骶骨倾斜角
            if (type === 'TK') return '#06b6d4'; // 青色 - 胸椎后凸角
            if (type === 'LL') return '#14b8a6'; // 蓝绿色 - 腰椎前凸角
            
            // 距离测量类
            if (type === 'RSH') return '#10b981'; // 绿色 - 肩高差
            if (type === 'AVT') return '#059669'; // 深绿色 - 顶椎平移量
            if (type === 'TS') return '#84cc16'; // 黄绿色 - 躯干偏移量
            if (type === 'SVA') return '#65a30d'; // 橄榄绿 - 矢状面椎体轴线
            if (type.includes('长度') || type === '长度测量') return '#22c55e'; // 浅绿色
            
            // 颈椎相关
            if (type.includes('C2-C7')) return '#0ea5e9'; // 天蓝色
            
            // 默认颜色
            return '#10b981'; // 默认绿色
          };
          
          const color = getMeasurementColor(measurement.type);
          
          // 将图像坐标转换为屏幕坐标
          const screenPoints = measurement.points.map(p => imageToScreen(p));
          return (
            <g key={measurement.id}>
              {/* 关键点 - 辅助图形不显示定位点 */}
              {!isAuxiliaryShape && screenPoints.map((point, pointIndex) => (
                <g key={pointIndex}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  {/* 点的序号标注 - 辅助图形不显示 */}
                  <text
                    x={point.x + 8}
                    y={point.y - 8}
                    fill={color}
                    fontSize="12"
                    fontWeight="bold"
                    stroke="#000000"
                    strokeWidth="0.5"
                    paintOrder="stroke"
                  >
                    {pointIndex + 1}
                  </text>
                </g>
              ))}
              {/* 连接线 - 辅助图形不显示连接线 */}
              {!isAuxiliaryShape && screenPoints.length >= 2 && (
                <>
                  {measurement.type.includes('角') ||
                  measurement.type.includes('Cobb') ||
                  measurement.type.includes('Tilt') ||
                  measurement.type.includes('Slope') ? (
                    screenPoints.length >= 4 ? (
                      <>
                        <line
                          x1={screenPoints[0].x}
                          y1={screenPoints[0].y}
                          x2={screenPoints[1].x}
                          y2={screenPoints[1].y}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray="3,3"
                        />
                        <line
                          x1={screenPoints[2].x}
                          y1={screenPoints[2].y}
                          x2={screenPoints[3].x}
                          y2={screenPoints[3].y}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray="3,3"
                        />
                      </>
                    ) : screenPoints.length >= 3 ? (
                      <>
                        <line
                          x1={screenPoints[0].x}
                          y1={screenPoints[0].y}
                          x2={screenPoints[1].x}
                          y2={screenPoints[1].y}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray="3,3"
                        />
                        <line
                          x1={screenPoints[1].x}
                          y1={screenPoints[1].y}
                          x2={screenPoints[2].x}
                          y2={screenPoints[2].y}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray="3,3"
                        />
                      </>
                    ) : null
                  ) : (
                    <line
                      x1={screenPoints[0].x}
                      y1={screenPoints[0].y}
                      x2={screenPoints[screenPoints.length - 1].x}
                      y2={screenPoints[screenPoints.length - 1].y}
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                  )}
                </>
              )}
              
              {/* 测量值标注 - 显示在测量线中间,辅助图形不显示 */}
              {!isAuxiliaryShape && screenPoints.length >= 2 && (
                <text
                  x={(screenPoints[0].x + screenPoints[screenPoints.length - 1].x) / 2}
                  y={(screenPoints[0].y + screenPoints[screenPoints.length - 1].y) / 2 - 10}
                  fill={color}
                  fontSize="14"
                  fontWeight="bold"
                  stroke="#000000"
                  strokeWidth="0.8"
                  paintOrder="stroke"
                  textAnchor="middle"
                >
                  {measurement.type}: {measurement.value}
                </text>
              )}
            </g>
          );
        })}

        {/* 绘制当前点击的点 */}
        {clickedPoints.map((point, index) => {
          const screenPoint = imageToScreen(point);
          return (
            <g key={`current-${index}`}>
              <circle
                cx={screenPoint.x}
                cy={screenPoint.y}
                r="4"
                fill="#ef4444"
                stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={screenPoint.x + 8}
              y={screenPoint.y - 8}
              fill="#ef4444"
              fontSize="12"
              fontWeight="bold"
              stroke="#000000"
              strokeWidth="0.5"
              paintOrder="stroke"
            >
              {index + 1}
            </text>
          </g>
          );
        })}

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
              ) : currentTool?.pointsNeeded === 3 && screenPoints.length >= 2 ? (
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

        {/* 绘制辅助圆形 - 从 measurements 中筛选 */}
        {measurements
          .filter(m => m.type === '圆形标注')
          .map(measurement => {
            if (measurement.points.length >= 2) {
              const center = measurement.points[0]; // 中心点
              const edge = measurement.points[1];   // 边缘点
              const radius = Math.sqrt(
                Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
              );
              const screenCenter = imageToScreen(center);
              return (
                <circle
                  key={measurement.id}
                  cx={screenCenter.x}
                  cy={screenCenter.y}
                  r={radius * imageScale}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  opacity="0.6"
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
              const radiusX = Math.abs(edge.x - center.x);
              const radiusY = Math.abs(edge.y - center.y);
              const screenCenter = imageToScreen(center);
              return (
                <ellipse
                  key={measurement.id}
                  cx={screenCenter.x}
                  cy={screenCenter.y}
                  rx={radiusX * imageScale}
                  ry={radiusY * imageScale}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  opacity="0.6"
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
              return (
                <rect
                  key={measurement.id}
                  x={topLeft.x}
                  y={topLeft.y}
                  width={bottomRight.x - topLeft.x}
                  height={bottomRight.y - topLeft.y}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                  opacity="0.6"
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
              return (
                <line
                  key={measurement.id}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  opacity="0.6"
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
                markerEnd="url(#arrowhead)"
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
            return (
              <polygon
                key={measurement.id}
                points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                opacity="0.6"
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
          
          if (selectedMeasurementId) {
            // 选中了测量结果
            const measurement = measurements.find(m => m.id === selectedMeasurementId);
            if (measurement) {
              selectedPoints = measurement.points;
            }
          } else if (selectedPointIndex !== null && clickedPoints[selectedPointIndex]) {
            // 选中了单个点
            selectedPoints = [clickedPoints[selectedPointIndex]];
          }
          
          if (selectedPoints.length === 0) return null;
          
          // 计算边界框
          const screenPoints = selectedPoints.map(p => imageToScreen(p));
          const xs = screenPoints.map(p => p.x);
          const ys = screenPoints.map(p => p.y);
          const minX = Math.min(...xs) - 15;
          const maxX = Math.max(...xs) + 15;
          const minY = Math.min(...ys) - 15;
          const maxY = Math.max(...ys) + 15;
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
              {/* 删除按钮 - 右上角 */}
              <g
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // 删除选中的对象
                  if (selectedMeasurementId) {
                    onMeasurementsUpdate(measurements.filter(m => m.id !== selectedMeasurementId));
                    setSelectedMeasurementId(null);
                  } else if (selectedPointIndex !== null) {
                    const newPoints = clickedPoints.filter((_, idx) => idx !== selectedPointIndex);
                    setClickedPoints(newPoints);
                    setSelectedPointIndex(null);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseMove={(e) => {
                  e.stopPropagation();
                }}
              >
                <circle
                  cx={maxX}
                  cy={minY}
                  r="12"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <line
                  x1={maxX - 6}
                  y1={minY - 6}
                  x2={maxX + 6}
                  y2={minY + 6}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={maxX - 6}
                  y1={minY + 6}
                  x2={maxX + 6}
                  y2={minY - 6}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
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
