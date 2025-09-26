
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  // 模拟影像数据 - 根据影像ID确定类型
  const getImageData = (id: string) => {
    if (id.includes('AP') || id === 'IMG001' || id === 'IMG004') {
      return {
        id: id,
        patientName: '张三',
        patientId: 'P202401001',
        examType: '正位X光片',
        studyDate: '2024-01-15',
        captureTime: '2024-01-15 14:35:22',
        seriesCount: 120,
        status: 'pending' as const,
      };
    } else if (id.includes('LAT') || id === 'IMG002' || id === 'IMG005') {
      return {
        id: id,
        patientName: '张三',
        patientId: 'P202401001',
        examType: '侧位X光片',
        studyDate: '2024-01-15',
        captureTime: '2024-01-15 14:35:22',
        seriesCount: 120,
        status: 'pending' as const,
      };
    } else {
      return {
        id: id,
        patientName: '张三',
        patientId: 'P202401001',
        examType: '体态照片',
        studyDate: '2024-01-15',
        captureTime: '2024-01-15 14:35:22',
        seriesCount: 120,
        status: 'pending' as const,
      };
    }
  };

  const imageData = getImageData(imageId);

  // 根据不同影像类型获取专用工具
  const getToolsForExamType = (examType: string) => {
    if (examType === '正位X光片') {
      return [
        { id: 't1-tilt', name: 'T1 Tilt', icon: 'ri-focus-3-line', description: 'T1椎体倾斜角测量', pointsNeeded: 4 },
        { id: 'cobb', name: 'Cobb', icon: 'ri-compass-3-line', description: 'Cobb角测量', pointsNeeded: 4 },
        { id: 'rsh', name: 'RSH', icon: 'ri-contrast-line', description: '肩高差测量(Radiographic Shoulder Height)', pointsNeeded: 2 },
        { id: 'pelvic', name: 'Pelvic', icon: 'ri-triangle-line', description: '骨盆倾斜角测量', pointsNeeded: 2 },
        { id: 'sacral', name: 'Sacral', icon: 'ri-square-line', description: '骶骨倾斜角测量', pointsNeeded: 4 },
        { id: 'avt', name: 'AVT', icon: 'ri-focus-2-line', description: '顶椎平移量(Apical Vertebral Translation)', pointsNeeded: 3 },
        { id: 'ts', name: 'TS', icon: 'ri-crosshair-2-line', description: '躯干偏移量(Trunk Shift)', pointsNeeded: 3 },
      ];
    } else if (examType === '侧位X光片') {
      return [
        { id: 't1-slope', name: 'T1 Slope', icon: 'ri-focus-3-line', description: 'T1倾斜角测量', pointsNeeded: 4 },
        { id: 'c2c7-cobb', name: 'C2-C7 Cobb', icon: 'ri-compass-3-line', description: '颈椎Cobb角测量', pointsNeeded: 4 },
        { id: 'tk', name: 'TK', icon: 'ri-moon-line', description: '胸椎后凸角(Thoracic Kyphosis)', pointsNeeded: 4 },
        { id: 'll', name: 'LL', icon: 'ri-bow-line', description: '腰椎前凸角(Lumbar Lordosis)', pointsNeeded: 4 },
        { id: 'sva', name: 'SVA', icon: 'ri-ruler-line', description: '矢状面椎体轴线(Sagittal Vertical Axis)', pointsNeeded: 2 },
        { id: 'pi', name: 'PI', icon: 'ri-triangle-line', description: '骨盆入射角(Pelvic Incidence)', pointsNeeded: 3 },
        { id: 'pt', name: 'PT', icon: 'ri-triangle-fill', description: '骨盆倾斜角(Pelvic Tilt)', pointsNeeded: 3 },
        { id: 'ss', name: 'SS', icon: 'ri-square-line', description: '骶骨倾斜角(Sacral Slope)', pointsNeeded: 4 },
      ];
    } else {
      return [
        { id: 'length', name: '长度测量', icon: 'ri-ruler-2-line', description: '距离测量工具', pointsNeeded: 2 },
        { id: 'angle', name: '角度测量', icon: 'ri-compass-3-line', description: '通用角度测量', pointsNeeded: 3 },
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
        defaultValue = Math.random() > 0.5 ? `${(Math.random() * 15 + 5).toFixed(1)}°` : `-${(Math.random() * 10 + 2).toFixed(1)}°`;
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
        defaultValue = Math.random() > 0.5 ? `${(Math.random() * 8 + 2).toFixed(1)}°` : `-${(Math.random() * 6 + 1).toFixed(1)}°`;
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
    }

    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      type,
      value: defaultValue,
      points: points,
      description,
    };
    setMeasurements((prev) => [...prev, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  };

  // 影像导航功能
  const imageList = ['IMG001', 'IMG002', 'IMG003', 'IMG004', 'IMG005', 'IMG006'];
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

  // 加载测量数据
  useEffect(() => {
    loadMeasurements();
  }, [imageId]);

  const loadMeasurements = async () => {
    setIsLoading(true);
    try {
      // 模拟API调用加载测量数据
      const response = await fetch(`/api/measurements/${imageId}`);
      if (response.ok) {
        const data = await response.json();
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
      setIsLoading(false);
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
      // 模拟API调用保存测量数据
      const measurementData = {
        imageId: imageId,
        patientId: imageData.patientId,
        examType: imageData.examType,
        measurements: measurements,
        reportText: reportText,
        savedAt: new Date().toISOString()
      };

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch(`/api/measurements/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(measurementData)
      });

      if (response.ok) {
        setSaveMessage('测量数据保存成功');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.log('保存测量数据:', error);
      // 模拟保存成功（因为是假接口）
      setSaveMessage('测量数据已保存（模拟保存）');
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
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10"
            >
              <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
            </Link>
            <div>
              <h1 className="text-white font-semibold">{imageData.patientName} - {imageData.examType}</h1>
              <p className="text-white/60 text-sm">影像ID: {imageData.id} | 患者ID: {imageData.patientId}</p>
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-white">
                <i className="ri-loader-line w-8 h-8 flex items-center justify-center animate-spin mb-3 text-2xl"></i>
                <p className="text-sm">加载测量数据中...</p>
              </div>
            ) : (
              <ImageCanvas 
                selectedImage={imageData}
                measurements={measurements}
                selectedTool={selectedTool}
                onMeasurementAdd={addMeasurement}
                tools={tools}
                clickedPoints={clickedPoints}
                setClickedPoints={setClickedPoints}
              />
            )}
          </div>
        </div>

        {/* 右侧工具栏 */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
          {/* 工具选择区 */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
            <h3 className="font-semibold text-white mb-3">测量工具 - {imageData.examType}</h3>

            {/* 横向工具栏 */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {/* 手工具 */}
                <button
                  onClick={() => setSelectedTool('hand')}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[60px] h-16 transition-all ${
                    selectedTool === 'hand' ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                {tools.map((tool) => (
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
                    <i className={`${tool.icon} w-5 h-5 flex items-center justify-center mb-1`}></i>
                    <span className="text-xs text-center leading-tight">{tool.name}</span>
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

            {/* 当前选中工具信息 */}
            {selectedTool !== 'hand' && currentTool && (
              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <i className={`${currentTool.icon} w-4 h-4 flex items-center justify-center text-blue-400`}></i>
                  <span className="text-white font-medium text-sm">{currentTool.name}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">{currentTool.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <span className="text-gray-400">需要标注: <span className="text-yellow-400">{currentTool.pointsNeeded}个点</span></span>
                  {clickedPoints.length > 0 && (
                    <span className="text-blue-400">已标注: {clickedPoints.length}/{currentTool.pointsNeeded}</span>
                  )}
                </div>
              </div>
            )}

            {/* 测量结果列表 */}
            <div className="max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">测量结果</h4>
                {measurements.length > 0 && (
                  <span className="text-xs text-gray-400">
                    ({measurements.length}项)
                  </span>
                )}
              </div>
              {measurements.length > 0 ? (
                <div className="space-y-2">
                  {measurements.map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between bg-gray-700/30 rounded px-2 py-1">
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-xs font-medium">{measurement.type}</span>
                        <div className="text-yellow-400 text-xs font-mono">{measurement.value}</div>
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
              onChange={(e) => setReportText(e.target.value)}
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
function ImageCanvas({ selectedImage, measurements, selectedTool, onMeasurementAdd, tools, clickedPoints, setClickedPoints }: {
  selectedImage: any;
  measurements: Measurement[];
  selectedTool: string;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  tools: any[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
}) {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showResults, setShowResults] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const getCurrentTool = () => tools.find(t => t.id === selectedTool);
  const currentTool = getCurrentTool();
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

    if (selectedTool === 'hand') {
      setIsDragging(true);
      setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y });
    } else {
      const newPoint = { x, y };
      const newPoints = [...clickedPoints, newPoint];
      setClickedPoints(newPoints);

      if (newPoints.length === pointsNeeded) {
        const toolName = currentTool?.name || '未知测量';
        onMeasurementAdd(toolName, newPoints);
        setClickedPoints([]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedTool === 'hand') {
      setImagePosition({
        x: x - dragStart.x,
        y: y - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

  const getImageUrl = (examType: string) => {
    if (examType === '正位X光片') {
      return "https://readdy.ai/api/search-image?query=medical%20spine%20X-ray0%20anterior%20posterior0%20view%20professional%20radiological%20image%20black%20background%20clean%20medical%20diagnostic%20imaging%20detailed%20anatomical%20structure%20vertebrae%20alignment&width=600&height=800&seq=spine-xray-ap&orientation=portrait";
    } else if (examType === '侧位X光片') {
      return "https://readdy.ai/api/search-image?query=medical%20spine%20X-ray%20lateral%20side%20view%20professional%20radiological%20image%20black%20background%20clean%20medical%20diagnostic%20imaging%20detailed%20sagittal%20anatomical%20structure%20vertebrae%20curvature&width=600&height=800&seq=spine-xray-lat&orientation=portrait";
    } else {
      return "https://readdy.ai/api/search-image?query=medical%20posture%20photograph%20patient%20standing%20clinical%20photography%20clean%20white%20background%20professional%20medical%20documentation%20body%20alignment%20assessment&width=600&height=800&seq=posture-photo&orientation=portrait";
    }
  };

  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${getCursorStyle()} ${isHovering ? 'ring-2 ring-blue-400/50' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* 左上角测量结果展示区 */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-black/20">
            <span className="text-white text-xs font-medium">测量结果</span>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-white/80 hover:text-white p-0.5"
            >
              <i className={`${showResults ? 'ri-eye-close-line' : 'ri-eye-line'} w-3 h-3 flex items-center justify-center`}></i>
            </button>
          </div>
          
          {showResults && (
            <div className="max-w-48 max-h-64 overflow-y-auto">
              {measurements.length > 0 ? (
                <div className="px-3 py-2 space-y-1">
                  {measurements.map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/90 truncate mr-2">{measurement.type}</span>
                      <span className="text-yellow-400 font-mono whitespace-nowrap">{measurement.value}</span>
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
      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1">
        <div className="flex items-center space-x-1 pr-2 border-r border-white/20">
          <button
            onClick={() => setImageScale(Math.min(5, imageScale * 1.2))}
            className="p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white"
            title="放大"
          >
            <i className="ri-zoom-in-line w-3 h-3 flex items-center justify-center"></i>
          </button>
          <button
            onClick={() => setImageScale(Math.max(0.1, imageScale * 0.8))}
            className="p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white"
            title="缩小"
          >
            <i className="ri-zoom-out-line w-3 h-3 flex items-center justify-center"></i>
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white"
            title="重置视图 - 恢复原始位置和缩放"
          >
            <i className="ri-refresh-line w-3 h-3 flex items-center justify-center"></i>
          </button>
          <div className="text-xs text-white/70 px-1.5">
            {Math.round(imageScale * 100)}%
          </div>
        </div>
        
        {selectedTool !== 'hand' && (
          <div className="flex items-center space-x-1 pl-2">
            <button
              onClick={clearCurrentMeasurement}
              className="p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white"
              title="清除当前标注点"
            >
              <i className="ri-eraser-line w-3 h-3 flex items-center justify-center"></i>
            </button>
          </div>
        )}
      </div>

      {/* 主图像 */}
      <div
        className="relative flex items-center justify-center w-full h-full"
        style={{
          transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <img
          src={getImageUrl(selectedImage.examType)}
          alt={selectedImage.examType}
          className="max-w-full max-h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* 参考线（仅正位和侧位显示） */}
        {(selectedImage.examType === '正位X光片' || selectedImage.examType === '侧位X光片') && (
          <>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-400 opacity-60 pointer-events-none"></div>
            <div className="absolute top-1/2 left-4 bg-green-400 text-black text-xs px-1 rounded pointer-events-none">HRL</div>
          </>
        )}
      </div>

      {/* SVG标注层 */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ zIndex: 10 }}
      >
        {/* 绘制已完成的测量 */}
        {measurements.map((measurement, index) => (
          <g key={measurement.id}>
            {measurement.points.map((point, pointIndex) => (
              <circle 
                key={pointIndex}
                cx={point.x} 
                cy={point.y} 
                r="3" 
                fill="#10b981" 
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
            {/* 连接线 */}
            {measurement.points.length >= 2 && (
              <>
                {measurement.type.includes('角') || measurement.type.includes('Cobb') || measurement.type.includes('Tilt') || measurement.type.includes('Slope') ? (
                  measurement.points.length >= 4 ? (
                    <>
                      <line
                        x1={measurement.points[0].x} y1={measurement.points[0].y}
                        x2={measurement.points[1].x} y2={measurement.points[1].y}
                        stroke="#10b981" strokeWidth="2" strokeDasharray="3,3"
                      />
                      <line
                        x1={measurement.points[2].x} y1={measurement.points[2].y}
                        x2={measurement.points[3].x} y2={measurement.points[3].y}
                        stroke="#10b981" strokeWidth="2" strokeDasharray="3,3"
                      />
                    </>
                  ) : measurement.points.length >= 3 ? (
                    <>
                      <line
                        x1={measurement.points[0].x} y1={measurement.points[0].y}
                        x2={measurement.points[1].x} y2={measurement.points[1].y}
                        stroke="#10b981" strokeWidth="2" strokeDasharray="3,3"
                      />
                      <line
                        x1={measurement.points[1].x} y1={measurement.points[1].y}
                        x2={measurement.points[2].x} y2={measurement.points[2].y}
                        stroke="#10b981" strokeWidth="2" strokeDasharray="3,3"
                      />
                    </>
                  ) : null
                ) : (
                  <line
                    x1={measurement.points[0].x} y1={measurement.points[0].y}
                    x2={measurement.points[measurement.points.length - 1].x} 
                    y2={measurement.points[measurement.points.length - 1].y}
                    stroke="#10b981" strokeWidth="2" strokeDasharray="3,3"
                  />
                )}
              </>
            )}
          </g>
        ))}

        {/* 绘制当前点击的点 */}
        {clickedPoints.map((point, index) => (
          <g key={`current-${index}`}>
            <circle 
              cx={point.x} 
              cy={point.y} 
              r="4" 
              fill="#ef4444" 
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text 
              x={point.x + 8} 
              y={point.y - 8} 
              fill="#ef4444" 
              fontSize="12" 
              fontWeight="bold"
            >
              {index + 1}
            </text>
          </g>
        ))}

        {/* 绘制当前点击点之间的连线预览 */}
        {clickedPoints.length >= 2 && selectedTool !== 'hand' && (
          <>
            {currentTool?.pointsNeeded === 4 && clickedPoints.length >= 2 ? (
              clickedPoints.length >= 2 && clickedPoints.length < 4 && (
                <line
                  x1={clickedPoints[0].x} y1={clickedPoints[0].y}
                  x2={clickedPoints[1].x} y2={clickedPoints[1].y}
                  stroke="#ef4444" strokeWidth="2" strokeDasharray="2,6"
                />
              )
            ) : currentTool?.pointsNeeded === 3 && clickedPoints.length >= 2 ? (
              clickedPoints.slice(0, -1).map((point, index) => (
                <line
                  key={`preview-line-${index}`}
                  x1={point.x} y1={point.y}
                  x2={clickedPoints[index + 1].x} y2={clickedPoints[index + 1].y}
                  stroke="#ef4444" strokeWidth="2" strokeDasharray="2,2"
                />
              ))
            ) : (
              <line
                x1={clickedPoints[0].x} y1={clickedPoints[0].y}
                x2={clickedPoints[clickedPoints.length - 1].x} y2={clickedPoints[clickedPoints.length - 1].y}
                stroke="#ef4444" strokeWidth="2" strokeDasharray="2,2"
              />
            )}
          </>
        )}
      </svg>

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded">
        {selectedTool === 'hand' ? (
          <div>
            <p className="font-medium">拖拽模式</p>
            <p>拖拽移动图像 | 鼠标悬停时滚轮缩放</p>
          </div>
        ) : (
          <div>
            <p className="font-medium">测量模式: {currentTool?.name}</p>
            <p>已标注 {clickedPoints.length}/{pointsNeeded} 个点</p>
            {clickedPoints.length < pointsNeeded && (
              <p className="text-yellow-400 mt-1">点击图像标注关键点</p>
            )}
          </div>
        )}
        {isHovering && (
          <p className="text-blue-400 mt-1">滚轮缩放已激活</p>
        )}
      </div>
    </div>
  );
}
