'use client';

import Header from '@/components/Header';
import DigitalSignature from '@/components/reports/DigitalSignature';
import ReportReview from '@/components/reports/ReportReview';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import React, { useEffect, useState } from 'react';

// 审核状态枚举
enum ReviewStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVISION = 'revision',
  FINAL = 'final',
}

// 审核级别枚举
enum ReviewLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  FINAL = 'final',
}

// 类型定义
interface PendingReport {
  report_id: string;
  title: string;
  patient_name: string;
  patient_id: string;
  report_type: string;
  current_level: ReviewLevel;
  submitted_at: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_time: number;
  submitter: string;
}

interface ReviewStatistics {
  total_pending: number;
  high_priority: number;
  overdue: number;
  avg_wait_time: number;
}

const ReportReviewPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    'list' | 'review' | 'signature'
  >('list');
  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(
    null
  );
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<ReviewLevel | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 获取待审核报告列表
  const fetchPendingReports = async () => {
    try {
      setLoading(true);

      // 模拟API调用
      const mockReports: PendingReport[] = [
        {
          report_id: 'RPT_001',
          title: '胸部X光检查报告',
          patient_name: '张三',
          patient_id: 'PAT_001',
          report_type: 'X-RAY',
          current_level: ReviewLevel.PRIMARY,
          submitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          estimated_time: 30,
          submitter: '李医生',
        },
        {
          report_id: 'RPT_002',
          title: '腰椎MRI检查报告',
          patient_name: '李四',
          patient_id: 'PAT_002',
          report_type: 'MRI',
          current_level: ReviewLevel.SECONDARY,
          submitted_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'normal',
          estimated_time: 45,
          submitter: '王医生',
        },
        {
          report_id: 'RPT_003',
          title: '头部CT检查报告',
          patient_name: '王五',
          patient_id: 'PAT_003',
          report_type: 'CT',
          current_level: ReviewLevel.PRIMARY,
          submitted_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          priority: 'urgent',
          estimated_time: 20,
          submitter: '赵医生',
        },
      ];

      const mockStatistics: ReviewStatistics = {
        total_pending: mockReports.length,
        high_priority: mockReports.filter(
          r => r.priority === 'high' || r.priority === 'urgent'
        ).length,
        overdue: 1,
        avg_wait_time: 45,
      };

      setPendingReports(mockReports);
      setStatistics(mockStatistics);
    } catch (error) {
      console.error('获取待审核报告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string): string => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  // 获取优先级文本
  const getPriorityText = (priority: string): string => {
    const texts = {
      low: '低',
      normal: '普通',
      high: '高',
      urgent: '紧急',
    };
    return texts[priority as keyof typeof texts] || priority;
  };

  // 获取级别文本
  const getLevelText = (level: ReviewLevel): string => {
    const levelTexts = {
      [ReviewLevel.PRIMARY]: '初审',
      [ReviewLevel.SECONDARY]: '复审',
      [ReviewLevel.FINAL]: '终审',
    };
    return levelTexts[level] || level;
  };

  // 过滤报告
  const filteredReports = pendingReports.filter(report => {
    const matchesLevel =
      filterLevel === 'all' || report.current_level === filterLevel;
    const matchesPriority =
      filterPriority === 'all' || report.priority === filterPriority;
    const matchesSearch =
      searchTerm === '' ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patient_id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesLevel && matchesPriority && matchesSearch;
  });

  // 处理报告选择
  const handleReportSelect = (report: PendingReport) => {
    setSelectedReport(report);
    setCurrentView('review');
  };

  // 处理审核完成
  const handleReviewComplete = (result: any) => {
    console.log('审核完成:', result);
    // 刷新列表
    fetchPendingReports();
    setCurrentView('list');
    setSelectedReport(null);
  };

  useEffect(() => {
    fetchPendingReports();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  报告审核工作台
                </h1>
                <p className="text-gray-600 mt-1">管理和审核医疗报告</p>
              </div>
              {currentView !== 'list' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentView('list');
                    setSelectedReport(null);
                  }}
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  返回列表
                </Button>
              )}
            </div>
          </div>

          {currentView === 'list' && (
            <>
              {/* 统计卡片 */}
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="ri-file-list-3-line text-2xl text-blue-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">
                          待审核总数
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statistics.total_pending}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="ri-alarm-warning-line text-2xl text-orange-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">
                          高优先级
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statistics.high_priority}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="ri-time-line text-2xl text-red-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">
                          超期报告
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statistics.overdue}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="ri-timer-line text-2xl text-green-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">
                          平均等待时间
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statistics.avg_wait_time}分钟
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 筛选和搜索 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      搜索
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="搜索报告、患者..."
                      />
                      <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      审核级别
                    </label>
                    <select
                      value={filterLevel}
                      onChange={e =>
                        setFilterLevel(e.target.value as ReviewLevel | 'all')
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">全部级别</option>
                      <option value={ReviewLevel.PRIMARY}>初审</option>
                      <option value={ReviewLevel.SECONDARY}>复审</option>
                      <option value={ReviewLevel.FINAL}>终审</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      优先级
                    </label>
                    <select
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">全部优先级</option>
                      <option value="urgent">紧急</option>
                      <option value="high">高</option>
                      <option value="normal">普通</option>
                      <option value="low">低</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterLevel('all');
                        setFilterPriority('all');
                      }}
                      className="w-full"
                    >
                      <i className="ri-refresh-line mr-2"></i>
                      重置筛选
                    </Button>
                  </div>
                </div>
              </div>

              {/* 报告列表 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    待审核报告 ({filteredReports.length})
                  </h3>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">加载中...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <i className="ri-file-list-3-line text-4xl mb-4"></i>
                    <p>暂无待审核报告</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredReports.map(report => (
                      <div
                        key={report.report_id}
                        className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleReportSelect(report)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {report.title}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}
                              >
                                {getPriorityText(report.priority)}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getLevelText(report.current_level)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">患者：</span>
                                {report.patient_name} ({report.patient_id})
                              </div>
                              <div>
                                <span className="font-medium">类型：</span>
                                {report.report_type}
                              </div>
                              <div>
                                <span className="font-medium">提交人：</span>
                                {report.submitter}
                              </div>
                              <div>
                                <span className="font-medium">提交时间：</span>
                                {new Date(report.submitted_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right text-sm text-gray-500">
                              <p>预计用时</p>
                              <p className="font-medium">
                                {report.estimated_time}分钟
                              </p>
                            </div>
                            <i className="ri-arrow-right-line text-gray-400"></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'review' && selectedReport && (
            <div className="space-y-6">
              {/* 报告信息 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  报告信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      报告标题
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedReport.title}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      患者信息
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedReport.patient_name} ({selectedReport.patient_id}
                      )
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      报告类型
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedReport.report_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* 审核组件 */}
              <ReportReview
                reportId={selectedReport.report_id}
                onReviewComplete={handleReviewComplete}
              />
            </div>
          )}

          {currentView === 'signature' && selectedReport && (
            <DigitalSignature
              documentId={selectedReport.report_id}
              documentType="medical_report"
              signerName="当前用户"
              signatureReason="医疗报告审核签名"
              signatureLocation="协和医院"
              onSignatureComplete={signature => {
                console.log('签名完成:', signature);
                setCurrentView('review');
              }}
              onSignatureCancel={() => setCurrentView('review')}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportReviewPage;
