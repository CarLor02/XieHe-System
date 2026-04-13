'use client';

/**
 * 报告管理页面
 *
 * 提供报告列表、创建、编辑、预览等功能
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, useUser } from '@/lib/api';
import { extractPaginatedData } from '@/lib/api/types';
import ReportEditor from '../../components/reports/ReportEditor';
import ReportExport from '../../components/reports/ReportExport';
import ReportPreview from '../../components/reports/ReportPreview';
import { Button } from '../../components/ui/Button';

interface ReportData {
  id: number;
  report_number: string;
  patient_id: number;
  patient_name?: string;
  study_id?: number;
  template_id?: number;
  report_title: string;
  clinical_history: string;
  examination_technique: string;
  findings: string;
  impression: string;
  recommendations: string;
  primary_diagnosis?: string;
  secondary_diagnosis?: string;
  priority: string;
  status: string;
  ai_assisted: boolean;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  reviewed_by?: number;
  reviewed_at?: string;
  examination_date?: string;
  report_date?: string;
  reporting_physician?: string;
  reviewing_physician?: string;
  approving_physician?: string;
  tags?: string[];
  notes?: string;
}

interface ReportTemplate {
  id: number;
  template_name: string;
  template_type: string;
  modality?: string;
  body_part?: string;
  template_content: {
    sections: any[];
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);
  const [currentView, setCurrentView] = useState<
    'list' | 'edit' | 'preview' | 'create' | 'export'
  >('list');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const reportsPerPage = 20;

  // 认证检查
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  // 获取报告数据
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('page_size', reportsPerPage.toString());

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }

      const response = await apiClient.get(`/api/v1/reports/?${params}`);

      // 使用 extractPaginatedData 提取分页数据
      const result = extractPaginatedData<any>(response);

      // 转换API数据格式
      if (result.items && result.items.length > 0) {
        const apiReports = result.items.map((report: any) => ({
          id: report.id,
          report_number: report.report_no || `RPT-${report.id}`,
          report_title: report.title || '诊断报告',
          status: report.status || 'draft',
          priority: report.priority || 'normal',
          patient_name: report.patient_name || '未知患者',
          patient_id: report.patient_id,
          examination_date:
            report.study_date || report.created_at?.split('T')[0] || '',
          report_date:
            report.report_date || report.created_at?.split('T')[0] || '',
          reporting_physician: report.doctor_name || '未指定医生',
          primary_diagnosis: report.diagnosis || '',
          clinical_history: report.clinical_history || '',
          examination_technique: report.examination_technique || '',
          findings: report.findings || '',
          impression: report.impression || '',
          recommendations: report.recommendations || '',
          notes: report.notes || '',
          tags: report.tags || [],
          ai_assisted: report.ai_assisted || false,
          ai_confidence: report.ai_confidence || 0,
          created_at: report.created_at || '',
          updated_at: report.updated_at || '',
        }));

        setReports(apiReports);
        setTotalReports(result.total);
      } else {
        setReports([]);
        setTotalReports(0);
      }
    } catch (err: any) {
      console.error('获取报告数据失败:', err);
      setError('获取报告数据失败，请稍后重试');
      setReports([]);
      setTotalReports(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentPage, searchTerm, statusFilter, priorityFilter]);

  // 由于使用API分页和筛选，直接使用reports
  const filteredReports = reports;

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

  // 保存报告
  const handleSaveReport = async (reportData: any) => {
    setLoading(true);
    try {
      // 这里应该调用API保存报告
      console.log('保存报告:', reportData);

      if (selectedReport) {
        // 更新现有报告
        setReports(prev =>
          prev.map(r =>
            r.id === selectedReport.id
              ? { ...r, ...reportData, updated_at: new Date().toISOString() }
              : r
          )
        );
      } else {
        // 创建新报告
        const newReport = {
          id: Date.now(),
          report_number: `20250924-RAD-${String(Date.now()).slice(-6)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          status: 'draft' as const,
          priority: 'normal' as const,
          patient_name: '新患者',
          patient_id: Date.now(),
          examination_date: new Date().toISOString().split('T')[0],
          report_date: new Date().toISOString().split('T')[0],
          reporting_physician: '当前医生',
          ai_assisted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...reportData,
        };
        setReports(prev => [newReport, ...prev]);
      }

      alert('报告保存成功！');
      setCurrentView('list');
    } catch (error) {
      console.error('保存报告失败:', error);
      alert('保存报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 预览报告
  const handlePreviewReport = (reportData: any) => {
    setSelectedReport({ ...selectedReport, ...reportData } as ReportData);
    setCurrentView('preview');
  };

  // 导出报告
  const handleExportReport = (format: 'pdf' | 'word' | 'image') => {
    console.log(`导出报告为 ${format} 格式`);
    alert(`正在导出为 ${format} 格式...`);
  };

  // 打印报告
  const handlePrintReport = () => {
    window.print();
  };

  // 渲染报告列表
  const renderReportList = () => (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索报告标题、患者姓名或报告编号..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有状态</option>
            <option value="draft">草稿</option>
            <option value="review">审核中</option>
            <option value="approved">已批准</option>
            <option value="finalized">已完成</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有优先级</option>
            <option value="low">低</option>
            <option value="normal">普通</option>
            <option value="high">高</option>
            <option value="urgent">紧急</option>
          </select>
          <Button
            variant="default"
            onClick={() => {
              setSelectedReport(null);
              setSelectedTemplate(null);
              setCurrentView('create');
            }}
          >
            ➕ 新建报告
          </Button>
        </div>
      </div>

      {/* 报告列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  报告信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  患者信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {report.report_title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.report_number}
                      </div>
                      {report.primary_diagnosis && (
                        <div className="text-sm text-blue-600 mt-1">
                          {report.primary_diagnosis}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {report.patient_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {report.patient_id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(report.status)}
                      {getPriorityBadge(report.priority)}
                      {report.ai_assisted && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                          🤖 AI辅助
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>检查: {report.examination_date}</div>
                    <div>报告: {report.report_date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setCurrentView('preview');
                        }}
                      >
                        👁️ 预览
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setCurrentView('edit');
                        }}
                      >
                        ✏️ 编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setCurrentView('export');
                        }}
                      >
                        📤 导出
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">📄</div>
            <p className="text-gray-500">暂无报告数据</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">诊断报告管理</h1>
              <p className="mt-2 text-gray-600">管理和编辑医学影像诊断报告</p>
            </div>

            {currentView !== 'list' && (
              <Button variant="outline" onClick={() => setCurrentView('list')}>
                ← 返回列表
              </Button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        {currentView === 'list' && renderReportList()}

        {currentView === 'create' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">创建新报告</h2>
            <ReportEditor
              template={selectedTemplate || undefined}
              onSave={handleSaveReport}
              onPreview={handlePreviewReport}
            />
          </div>
        )}

        {currentView === 'edit' && selectedReport && (
          <div>
            <h2 className="text-xl font-semibold mb-4">编辑报告</h2>
            <ReportEditor
              initialData={selectedReport}
              onSave={handleSaveReport}
              onPreview={handlePreviewReport}
            />
          </div>
        )}

        {currentView === 'preview' && selectedReport && (
          <div>
            <ReportPreview
              reportData={selectedReport}
              onEdit={() => setCurrentView('edit')}
              onExport={handleExportReport}
              onPrint={handlePrintReport}
            />
          </div>
        )}

        {currentView === 'export' && selectedReport && (
          <div>
            <h2 className="text-xl font-semibold mb-4">导出报告</h2>
            <ReportExport
              reportIds={[selectedReport.id]}
              reportTitles={[selectedReport.report_title]}
              onExportStart={() => console.log('开始导出...')}
              onExportComplete={(taskId, downloadUrl) => {
                console.log('导出完成:', taskId, downloadUrl);
                // 可以显示成功通知或自动下载
              }}
              onExportError={error => {
                console.error('导出失败:', error);
                // 可以显示错误通知
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
