'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/lib/api';
import {
  downloadImageFile,
  getAllImageFiles,
  type ImageFile,
} from '@/services/imageServices/imageFileService';
import {
  getMeasurementRecord,
  MeasurementRecord,
} from '@/services/imageServices/measurementService';
import {
  buildAnnotationPointRows,
  buildExportFilename,
  buildKeypointRows,
  buildMeasurementRows,
  buildTrainingLabelBlob,
  buildTrainingLabelFilename,
  createTabularBlob,
  ExportContentType,
  ExportFile,
  getAiDetectionMeasurements,
  getMeasurementsForImage,
  getParameterMeasurements,
  parseAnnotationData,
} from './domain';
import { createAnnotatedImageBlob, downloadExportFiles } from './usecases';
import { useExportContentOptions } from './hooks';
import { Download, FileSpreadsheet, Search, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DataExportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  const [mounted, setMounted] = useState(false);
  const canExportAnnotationPoints = Boolean(
    user?.is_superuser ||
      user?.is_system_admin ||
      user?.role === 'admin' ||
      user?.role === 'system_admin' ||
      user?.role === 'team_admin' ||
      user?.role === 'ADMIN'
  );

  // 筛选条件
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [examType, setExamType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportContent, setExportContent] =
    useState<ExportContentType>('original-image');
  const tabularExportFormat = 'csv' as const;
  const annotatedImageFormat = 'png' as const;

  // 影像列表和选择
  const [images, setImages] = useState<ImageFile[]>([]);
  const [measurementRecords, setMeasurementRecords] = useState<
    Record<number, MeasurementRecord>
  >({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoadingList, setIsLoadingList] = useState(false);

  // 状态
  const [isLoading, setIsLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [message, setMessage] = useState('');

  const exportContentOptions = useExportContentOptions(canExportAnnotationPoints);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 权限检查：登录用户均可访问，具体导出项按角色限制
  useEffect(() => {
    if (!mounted) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (
      exportContent === 'annotation-points' &&
      !canExportAnnotationPoints
    ) {
      setExportContent('original-image');
    }
  }, [canExportAnnotationPoints, exportContent]);

  // 获取影像列表
  const fetchImages = async () => {
    setIsLoadingList(true);
    try {
      const allImages = await getAllImageFiles({
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
        description: examType !== 'all' ? examType : undefined,
        search: searchQuery || undefined,
      }, 100);
      const records = await Promise.all(
        allImages.map(async image => ({
          image,
          measurementRecord: await getMeasurementRecord(image.id),
        }))
      );

      const nextMeasurementRecords: Record<number, MeasurementRecord> = {};
      records.forEach(({ image, measurementRecord }) => {
        const annotationData = parseAnnotationData(image);
        const measurements =
          annotationData?.measurements ?? measurementRecord?.measurements ?? [];
        if (measurements.length > 0 && measurementRecord) {
          nextMeasurementRecords[image.id] = measurementRecord;
        }
      });

      setMeasurementRecords(nextMeasurementRecords);
      setImages(allImages);
      setSelectedIds(prev => {
        const visibleIds = new Set(allImages.map(image => image.id));
        return new Set([...prev].filter(id => visibleIds.has(id)));
      });
    } catch (error) {
      console.error('获取影像列表失败:', error);
      setMessage('获取影像列表失败，请重试');
    } finally {
      setIsLoadingList(false);
    }
  };

  // 初始加载和筛选条件变化时刷新列表
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    fetchImages();
  }, [mounted, isAuthenticated, dateRange, examType, searchQuery]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map(img => img.id)));
    }
  };

  // 切换单个选择
  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      setMessage('请至少选择一个影像文件进行导出');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (
      (exportContent === 'annotation-points' || exportContent === 'training-data') &&
      !canExportAnnotationPoints
    ) {
      setMessage('当前账号无权导出标注点检测数据');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    setExportProgress(0);
    setMessage('');

    try {
      const selectedImages = images.filter(img => selectedIds.has(img.id));
      const exportFiles: ExportFile[] = [];
      const total = Math.max(selectedImages.length, 1);

      for (let index = 0; index < selectedImages.length; index += 1) {
        const img = selectedImages[index];
        const annotationData = parseAnnotationData(img);
        const measurementRecord = measurementRecords[img.id];
        const fallbackMeasurements = measurementRecord?.measurements ?? [];
        const measurements = getMeasurementsForImage(img, fallbackMeasurements);

        if (exportContent === 'original-image') {
          const originalImageBlob = await downloadImageFile(img.id);
          const blob = await createAnnotatedImageBlob({
            imageBlob: originalImageBlob,
            measurements: [],
            format: 'png',
          });
          exportFiles.push({
            filename: buildExportFilename(img, exportContent, 'png'),
            blob,
          });
        } else if (exportContent === 'annotated-image') {
          const originalImageBlob = await downloadImageFile(img.id);
          const blob = await createAnnotatedImageBlob({
            imageBlob: originalImageBlob,
            measurements,
            annotationSize: {
              width: annotationData?.imageWidth,
              height: annotationData?.imageHeight,
            },
            format: annotatedImageFormat,
          });
          exportFiles.push({
            filename: buildExportFilename(img, exportContent, annotatedImageFormat),
            blob,
          });
        } else if (exportContent === 'annotation-points') {
          const rows =
            annotationData?.keypoints && annotationData.keypoints.length > 0
              ? buildKeypointRows(img, annotationData.keypoints)
              : buildAnnotationPointRows(
                  img,
                  getAiDetectionMeasurements(measurements)
                );
          exportFiles.push({
            filename: buildExportFilename(img, exportContent, tabularExportFormat),
            blob: createTabularBlob(rows, tabularExportFormat, exportContent),
          });
        } else if (exportContent === 'training-data') {
          // 训练数据：原始图像 + 归一化坐标 label JSON
          const keypoints = annotationData?.keypoints ?? [];
          if (keypoints.length === 0) {
            // 没有检测点的影像跳过 label 文件，只导出原图
            const blob = await downloadImageFile(img.id);
            exportFiles.push({
              filename: buildExportFilename(img, 'original-image', 'original'),
              blob,
            });
          } else {
            const imageWidth = annotationData?.imageWidth;
            const imageHeight = annotationData?.imageHeight;
            if (!imageWidth || !imageHeight) {
              // 缺少尺寸信息，跳过该影像
              console.warn(`影像 ${img.id} 缺少尺寸信息，跳过训练数据导出`);
            } else {
              // 原始图像
              const imageBlob = await downloadImageFile(img.id);
              exportFiles.push({
                filename: buildExportFilename(img, 'training-data', 'original'),
                blob: imageBlob,
              });
              // label JSON
              exportFiles.push({
                filename: buildTrainingLabelFilename(img),
                blob: buildTrainingLabelBlob(img, keypoints, imageWidth, imageHeight),
              });
            }
          }
        } else {
          const rows = buildMeasurementRows(
            img,
            getParameterMeasurements(measurements)
          );
          exportFiles.push({
            filename: buildExportFilename(img, exportContent, tabularExportFormat),
            blob: createTabularBlob(rows, tabularExportFormat, exportContent),
          });
        }

        setExportProgress(Math.round(((index + 1) / total) * 85));
      }

      const zipFilename = `data_export_${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadExportFiles(exportFiles, zipFilename);

      setExportProgress(100);
      setMessage(`成功导出 ${exportFiles.length} 个文件！`);

      setTimeout(() => {
        setMessage('');
        setExportProgress(0);
      }, 3000);

    } catch (error: any) {
      console.error('导出失败:', error);
      setMessage(error.response?.data?.detail || '导出失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
            <p className="text-gray-600 mt-1">批量导出原图、绘图影像、标注点和测量参数</p>
          </div>

          {/* 筛选配置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期范围
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 检查类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  检查类型
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部类型</option>
                  <option value="正位X光片">正位X光片</option>
                  <option value="侧位X光片">侧位X光片</option>
                  <option value="左侧曲位">左侧曲位</option>
                  <option value="右侧曲位">右侧曲位</option>
                  <option value="体态照片">体态照片</option>
                </select>
              </div>

              {/* 搜索患者 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  患者姓名
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索患者姓名..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 影像列表 */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  影像列表
                  <span className="ml-2 text-sm text-gray-500">
                    ({images.length} 条记录，已选 {selectedIds.size} 条)
                  </span>
                </h2>
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {selectedIds.size === images.length && images.length > 0 ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>取消全选</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      <span>全选</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isLoadingList ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">正在加载影像列表...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无符合条件的影像</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        选择
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        影像ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        患者ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        检查类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        文件名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        上传日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        测量项数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {images.map((img) => {
                      const isSelected = selectedIds.has(img.id);
                      const annotationData = parseAnnotationData(img);
                      const measurementCount =
                        getParameterMeasurements(
                          annotationData?.measurements ||
                            measurementRecords[img.id]?.measurements ||
                            []
                        ).length;

                      return (
                        <tr
                          key={img.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleToggleSelect(img.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {img.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {img.patient_id || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {img.description || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {img.original_filename}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(img.created_at).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {measurementCount} 项
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 导出配置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">导出设置</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导出内容
                </label>
                <select
                  value={exportContent}
                  onChange={(e) => setExportContent(e.target.value as ExportContentType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {exportContentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!canExportAnnotationPoints && (
                  <p className="text-xs text-gray-500 mt-2">
                    非管理员账号不可导出标注点检测数据
                  </p>
                )}
              </div>


            </div>
          </div>

          {/* 导出按钮 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <button
              onClick={handleExport}
              disabled={isLoading || selectedIds.size === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>导出中... {exportProgress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>
                    {selectedIds.size > 0
                      ? `导出选中的 ${selectedIds.size} 个文件`
                      : '请先选择要导出的影像'}
                  </span>
                </>
              )}
            </button>

            {/* 进度条 */}
            {isLoading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 消息提示 */}
            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.includes('成功')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 使用筛选条件过滤影像列表，系统会显示当前账号可见的影像</li>
              <li>• 在列表中勾选需要导出的影像，支持全选和单选</li>
              <li>• 管理员可导出原图影像、绘图影像、标注点检测、参数测量和训练数据</li>
              <li>• 非管理员可导出原图影像、绘图影像和参数测量</li>
              <li>• 批量导出会下载 ZIP 包，包内文件使用原始文件名和所选格式后缀</li>
              <li>• CSV 格式使用 UTF-8 编码，Excel 格式使用 XLS 兼容表格</li>
              <li>• 训练数据：每张影像导出原图 + 同名 _label.json（椎体角点归一化坐标，用于模型训练）</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
