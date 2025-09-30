'use client';

/**
 * 报告批量导出页面
 *
 * 提供报告的批量导出功能，支持筛选条件和导出选项
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useEffect, useState } from 'react';
import ReportExport from '../../../components/reports/ReportExport';
import { Button } from '../../../components/ui/Button';

interface ReportData {
  id: number;
  report_number: string;
  report_title: string;
  status: 'draft' | 'review' | 'approved' | 'finalized';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  patient_name?: string;
  patient_id: number;
  examination_date?: string;
  report_date: string;
  reporting_physician: string;
  primary_diagnosis?: string;
  created_at: string;
  updated_at: string;
}

interface ExportFilters {
  patient_id?: number;
  status?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  reporting_physician?: string;
  search?: string;
}

export default function ReportExportPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [filters, setFilters] = useState<ExportFilters>({});
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // 获取报告数据
  const fetchReports = async () => {
    try {
      setLoading(true);

      const { createAuthenticatedClient } = await import('@/store/authStore');
      const client = createAuthenticatedClient();

      // 只获取已完成的报告用于导出
      const response = await client.get(
        '/api/v1/reports/?status=finalized&status=approved'
      );

      if (response.data && response.data.reports) {
        const apiReports = response.data.reports.map((report: any) => ({
          id: report.id,
          report_number: report.report_no || `RPT-${report.id}`,
          report_title: report.title || '诊断报告',
          status: report.status || 'finalized',
          priority: report.priority || 'normal',
          patient_name: report.patient_name || '未知患者',
          patient_id: report.patient_id,
          examination_date:
            report.study_date || report.created_at?.split('T')[0] || '',
          report_date:
            report.report_date || report.created_at?.split('T')[0] || '',
          reporting_physician: report.doctor_name || '未指定医生',
          primary_diagnosis: report.diagnosis || '',
          created_at: report.created_at || '',
          updated_at: report.updated_at || '',
        }));

        setReports(apiReports);
      } else {
        setReports([]);
      }
    } catch (err: any) {
      console.error('获取报告数据失败:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 筛选报告
  const filteredReports = reports.filter(report => {
    if (filters.patient_id && report.patient_id !== filters.patient_id)
      return false;
    if (filters.status && report.status !== filters.status) return false;
    if (filters.priority && report.priority !== filters.priority) return false;
    if (filters.date_from && report.report_date < filters.date_from)
      return false;
    if (filters.date_to && report.report_date > filters.date_to) return false;
    if (
      filters.reporting_physician &&
      !report.reporting_physician.includes(filters.reporting_physician)
    )
      return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        report.report_title.toLowerCase().includes(searchLower) ||
        report.patient_name?.toLowerCase().includes(searchLower) ||
        report.report_number.toLowerCase().includes(searchLower) ||
        report.primary_diagnosis?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // 状态标签样式
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      finalized: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      draft: '草稿',
      review: '审核中',
      approved: '已批准',
      finalized: '已完成',
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // 优先级标签样式
  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    };
    const labels = {
      low: '低',
      normal: '普通',
      high: '高',
      urgent: '紧急',
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${styles[priority as keyof typeof styles]}`}
      >
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(filteredReports.map(r => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  // 单选
  const handleSelectReport = (reportId: number, checked: boolean) => {
    if (checked) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  // 导出处理
  const handleExportStart = () => {
    console.log('开始导出...');
  };

  const handleExportComplete = (taskId: string, downloadUrl: string) => {
    console.log('导出完成:', taskId, downloadUrl);
    // 可以显示成功通知
  };

  const handleExportError = (error: string) => {
    console.error('导出失败:', error);
    // 可以显示错误通知
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">报告批量导出</h1>
          <p className="mt-2 text-gray-600">
            选择报告并导出为PDF、Word、图片等格式
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：报告列表和筛选 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 筛选条件 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    筛选条件
                  </h2>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showFilters ? '隐藏筛选' : '显示筛选'}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 搜索 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        搜索
                      </label>
                      <input
                        type="text"
                        value={filters.search || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                        placeholder="报告标题、患者姓名、报告编号..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* 状态筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态
                      </label>
                      <select
                        value={filters.status || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            status: e.target.value || undefined,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">所有状态</option>
                        <option value="draft">草稿</option>
                        <option value="review">审核中</option>
                        <option value="approved">已批准</option>
                        <option value="finalized">已完成</option>
                      </select>
                    </div>

                    {/* 优先级筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        优先级
                      </label>
                      <select
                        value={filters.priority || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            priority: e.target.value || undefined,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">所有优先级</option>
                        <option value="low">低</option>
                        <option value="normal">普通</option>
                        <option value="high">高</option>
                        <option value="urgent">紧急</option>
                      </select>
                    </div>

                    {/* 日期范围 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        开始日期
                      </label>
                      <input
                        type="date"
                        value={filters.date_from || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            date_from: e.target.value || undefined,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        结束日期
                      </label>
                      <input
                        type="date"
                        value={filters.date_to || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            date_to: e.target.value || undefined,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* 报告医师 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        报告医师
                      </label>
                      <input
                        type="text"
                        value={filters.reporting_physician || ''}
                        onChange={e =>
                          setFilters(prev => ({
                            ...prev,
                            reporting_physician: e.target.value || undefined,
                          }))
                        }
                        placeholder="医师姓名"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setFilters({})}
                      variant="outline"
                      size="sm"
                    >
                      清除筛选
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 报告列表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      报告列表 ({filteredReports.length})
                    </h2>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedReports.length === filteredReports.length &&
                          filteredReports.length > 0
                        }
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">全选</label>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    已选择 {selectedReports.length} 个报告
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredReports.map(report => (
                  <div key={report.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={e =>
                          handleSelectReport(report.id, e.target.checked)
                        }
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {report.report_title}
                          </h3>
                          <div className="flex gap-2">
                            {getStatusBadge(report.status)}
                            {getPriorityBadge(report.priority)}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div>报告编号: {report.report_number}</div>
                          <div>
                            患者: {report.patient_name} (ID: {report.patient_id}
                            )
                          </div>
                          <div>医师: {report.reporting_physician}</div>
                          <div>日期: {report.report_date}</div>
                          {report.primary_diagnosis && (
                            <div>诊断: {report.primary_diagnosis}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredReports.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">📄</div>
                  <p className="text-gray-500">没有找到符合条件的报告</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：导出组件 */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ReportExport
                reportIds={selectedReports}
                reportTitles={filteredReports
                  .filter(r => selectedReports.includes(r.id))
                  .map(r => r.report_title)}
                onExportStart={handleExportStart}
                onExportComplete={handleExportComplete}
                onExportError={handleExportError}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
