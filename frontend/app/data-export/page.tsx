'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/lib/api';
import { getImageFiles, type ImageFile } from '@/services/imageFileService';
import { Download, FileSpreadsheet, Search, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DataExportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  const [mounted, setMounted] = useState(false);

  // 筛选条件
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [examType, setExamType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');

  // 影像列表和选择
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoadingList, setIsLoadingList] = useState(false);

  // 状态
  const [isLoading, setIsLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 权限检查：只有管理员可以访问
  useEffect(() => {
    if (!mounted) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    const isSuperuser = user?.is_superuser || false;
    if (!isSuperuser) {
      router.push('/dashboard');
      return;
    }
  }, [mounted, isAuthenticated, user, router]);

  // 获取影像列表
  const fetchImages = async () => {
    setIsLoadingList(true);
    try {
      const response = await getImageFiles({
        page: 1,
        page_size: 20,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
        description: examType !== 'all' ? examType : undefined,
        search: searchQuery || undefined,
      });
      const allImages = response.items || [];

      // 只显示有标注的影像
      const annotatedImages = allImages.filter(img => {
        if (!img.annotation) return false;
        try {
          const annotationData = JSON.parse(img.annotation);
          return (
            Array.isArray(annotationData.measurements) &&
            annotationData.measurements.length > 0
          );
        } catch {
          return false;
        }
      });

      setImages(annotatedImages);
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

  if (!mounted || !isAuthenticated || !user?.is_superuser) {
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
      setMessage('请至少选择一条影像数据进行导出');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    setExportProgress(0);
    setMessage('');

    try {
      setExportProgress(20);

      // 获取选中的影像数据
      const selectedImages = images.filter(img => selectedIds.has(img.id));

      setExportProgress(50);

      setExportProgress(70);

      // 准备导出数据
      const exportData = selectedImages.map(img => {
        const measurements: Record<string, string | number> = {};

        try {
          const annotationData = JSON.parse(img.annotation || '{}');

          if (
            Array.isArray(annotationData.measurements) &&
            annotationData.measurements.length > 0
          ) {
            annotationData.measurements.forEach((m: any) => {
              // 提取测量类型和值
              const typeName = m.type || 'Unknown';
              const value = m.value || '';
              measurements[typeName] = value;
            });
          }

          // 添加标准距离信息
          if (annotationData.standardDistance) {
            measurements['标准距离(mm)'] = annotationData.standardDistance;
          }
        } catch (error) {
          console.error('解析标注数据失败:', error);
        }

        return {
          影像ID: img.id,
          患者姓名: img.patient?.name || img.patient_name || '',
          检查类型: img.description || '',
          上传日期: new Date(img.created_at).toLocaleDateString('zh-CN'),
          文件名: img.original_filename || '',
          ...measurements,
        };
      });
      
      setExportProgress(90);
      
      // 导出文件
      if (exportFormat === 'csv') {
        exportToCSV(exportData);
      } else if (exportFormat === 'json') {
        exportToJSON(exportData);
      } else if (exportFormat === 'excel') {
        exportToCSV(exportData); // 暂时使用CSV格式
      }

      setExportProgress(100);
      setMessage(`成功导出 ${exportData.length} 条数据！`);

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

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) {
      setMessage('没有可导出的数据');
      return;
    }

    // 获取所有列名
    const headers = Object.keys(data[0]);

    // 构建CSV内容
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          // 处理包含逗号的值
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // 创建Blob并下载
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `annotations_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = (data: any[]) => {
    if (data.length === 0) {
      setMessage('没有可导出的数据');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `annotations_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
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
            <p className="text-gray-600 mt-1">批量导出影像标注和测量结果</p>
          </div>

          {/* 筛选配置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="正面片">正面片</option>
                  <option value="侧面片">侧面片</option>
                  <option value="其他">其他</option>
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
                  已标注影像列表
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
                <p className="text-gray-500">暂无符合条件的已标注影像</p>
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
                        患者姓名
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
                      let measurementCount = 0;
                      try {
                        const annotationData = JSON.parse(img.annotation || '{}');
                        measurementCount = annotationData.measurements?.length || 0;
                      } catch {}

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
                            {img.patient?.name || '-'}
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

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'excel')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="csv">CSV (Excel兼容)</option>
                <option value="json">JSON</option>
                <option value="excel">Excel (XLSX)</option>
              </select>
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
                      ? `导出选中的 ${selectedIds.size} 条数据`
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
              <li>• 使用筛选条件过滤影像列表，系统只显示已标注的影像</li>
              <li>• 在列表中勾选需要导出的影像，支持全选和单选</li>
              <li>• 选择导出格式后点击导出按钮，系统将自动下载数据文件</li>
              <li>• CSV 格式使用 UTF-8 编码，可直接在 Excel 中打开</li>
              <li>• JSON 格式包含完整的结构化数据，适合程序处理</li>
              <li>• 导出数据包含：影像ID、患者姓名、检查类型、上传日期、文件名及所有测量结果</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
