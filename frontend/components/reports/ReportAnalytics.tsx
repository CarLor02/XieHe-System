'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// 时间范围枚举
enum TimeRange {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

// 图表类型枚举
enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter'
}

// 类型定义
interface ReportStatistics {
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  rejected_reports: number;
  completion_rate: number;
  average_completion_time: number;
  reports_by_type: Record<string, number>;
  reports_by_department: Record<string, number>;
  reports_by_status: Record<string, number>;
}

interface DoctorWorkload {
  doctor_id: string;
  doctor_name: string;
  department: string;
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  average_completion_time: number;
  efficiency_score: number;
  workload_trend: Array<{date: string; reports: number; completion_time: number}>;
}

interface PatientAnalytics {
  total_patients: number;
  new_patients: number;
  returning_patients: number;
  patients_by_age_group: Record<string, number>;
  patients_by_gender: Record<string, number>;
  patients_by_department: Record<string, number>;
  patient_visit_frequency: Record<string, number>;
}

interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

interface ChartData {
  chart_type: ChartType;
  title: string;
  x_axis_label: string;
  y_axis_label: string;
  data: TimeSeriesData[];
  colors?: string[];
}

interface ReportAnalyticsProps {
  onExport?: (format: string) => void;
}

const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ onExport }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.MONTH);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [doctorWorkload, setDoctorWorkload] = useState<DoctorWorkload[]>([]);
  const [patientAnalytics, setPatientAnalytics] = useState<PatientAnalytics | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'trends'>('overview');

  // 获取统计数据
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // 模拟API调用
      const mockStatistics: ReportStatistics = {
        total_reports: 1247,
        completed_reports: 1089,
        pending_reports: 98,
        rejected_reports: 60,
        completion_rate: 87.3,
        average_completion_time: 2.4,
        reports_by_type: {
          "X-RAY": 456,
          "CT": 298,
          "MRI": 234,
          "超声": 189,
          "其他": 70
        },
        reports_by_department: {
          "放射科": 567,
          "心内科": 234,
          "骨科": 189,
          "神经科": 156,
          "其他": 101
        },
        reports_by_status: {
          "已完成": 1089,
          "待审核": 98,
          "已拒绝": 60
        }
      };

      const mockDoctors: DoctorWorkload[] = [
        {
          doctor_id: 'DOC_001',
          doctor_name: '张医生',
          department: '放射科',
          total_reports: 156,
          completed_reports: 142,
          pending_reports: 14,
          average_completion_time: 2.1,
          efficiency_score: 91.2,
          workload_trend: [
            { date: '2025-09-18', reports: 18, completion_time: 2.0 },
            { date: '2025-09-19', reports: 22, completion_time: 2.1 },
            { date: '2025-09-20', reports: 20, completion_time: 2.2 },
            { date: '2025-09-21', reports: 25, completion_time: 2.0 },
            { date: '2025-09-22', reports: 19, completion_time: 2.3 },
            { date: '2025-09-23', reports: 23, completion_time: 1.9 },
            { date: '2025-09-24', reports: 21, completion_time: 2.1 }
          ]
        },
        {
          doctor_id: 'DOC_002',
          doctor_name: '李医生',
          department: '心内科',
          total_reports: 134,
          completed_reports: 118,
          pending_reports: 16,
          average_completion_time: 2.8,
          efficiency_score: 88.1,
          workload_trend: [
            { date: '2025-09-18', reports: 15, completion_time: 2.8 },
            { date: '2025-09-19', reports: 19, completion_time: 2.7 },
            { date: '2025-09-20', reports: 17, completion_time: 2.9 },
            { date: '2025-09-21', reports: 21, completion_time: 2.6 },
            { date: '2025-09-22', reports: 16, completion_time: 3.0 },
            { date: '2025-09-23', reports: 20, completion_time: 2.8 },
            { date: '2025-09-24', reports: 18, completion_time: 2.7 }
          ]
        }
      ];

      const mockPatients: PatientAnalytics = {
        total_patients: 2456,
        new_patients: 234,
        returning_patients: 2222,
        patients_by_age_group: {
          "0-18": 156,
          "19-35": 567,
          "36-50": 789,
          "51-65": 634,
          "65+": 310
        },
        patients_by_gender: {
          "男": 1234,
          "女": 1222
        },
        patients_by_department: {
          "放射科": 789,
          "心内科": 456,
          "骨科": 345,
          "神经科": 234,
          "其他": 632
        },
        patient_visit_frequency: {
          "首次就诊": 234,
          "2-5次": 1456,
          "6-10次": 567,
          "10次以上": 199
        }
      };

      const mockCharts: ChartData[] = [
        {
          chart_type: ChartType.LINE,
          title: '报告数量趋势',
          x_axis_label: '日期',
          y_axis_label: '报告数量',
          data: [
            { date: '2025-09-18', value: 45, label: '45份报告' },
            { date: '2025-09-19', value: 52, label: '52份报告' },
            { date: '2025-09-20', value: 38, label: '38份报告' },
            { date: '2025-09-21', value: 61, label: '61份报告' },
            { date: '2025-09-22', value: 47, label: '47份报告' },
            { date: '2025-09-23', value: 55, label: '55份报告' },
            { date: '2025-09-24', value: 49, label: '49份报告' }
          ],
          colors: ['#3B82F6']
        }
      ];

      setStatistics(mockStatistics);
      setDoctorWorkload(mockDoctors);
      setPatientAnalytics(mockPatients);
      setCharts(mockCharts);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取时间范围文本
  const getTimeRangeText = (range: TimeRange): string => {
    const texts = {
      [TimeRange.TODAY]: '今日',
      [TimeRange.WEEK]: '本周',
      [TimeRange.MONTH]: '本月',
      [TimeRange.QUARTER]: '本季度',
      [TimeRange.YEAR]: '本年',
      [TimeRange.CUSTOM]: '自定义'
    };
    return texts[range] || range;
  };

  // 处理导出
  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format);
    } else {
      alert(`导出${format.toUpperCase()}格式的统计报告`);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载统计数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">报告统计分析</h2>
          <p className="text-gray-600 mt-1">数据统计与分析报告</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 时间范围选择 */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={TimeRange.TODAY}>今日</option>
            <option value={TimeRange.WEEK}>本周</option>
            <option value={TimeRange.MONTH}>本月</option>
            <option value={TimeRange.QUARTER}>本季度</option>
            <option value={TimeRange.YEAR}>本年</option>
          </select>
          
          {/* 导出按钮 */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
            >
              <i className="ri-file-excel-line mr-2"></i>
              导出Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
            >
              <i className="ri-file-pdf-line mr-2"></i>
              导出PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '总览', icon: 'ri-dashboard-line' },
            { id: 'doctors', name: '医生工作量', icon: 'ri-user-line' },
            { id: 'patients', name: '患者分析', icon: 'ri-group-line' },
            { id: 'trends', name: '趋势分析', icon: 'ri-line-chart-line' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 总览标签页 */}
      {activeTab === 'overview' && statistics && (
        <div className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-file-list-3-line text-2xl text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总报告数</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_reports}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-check-line text-2xl text-green-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.completed_reports}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-time-line text-2xl text-orange-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">待处理</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.pending_reports}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-percent-line text-2xl text-purple-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">完成率</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.completion_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 分布图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 报告类型分布 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">报告类型分布</h3>
              <div className="space-y-3">
                {Object.entries(statistics.reports_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / statistics.total_reports) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 科室分布 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">科室分布</h3>
              <div className="space-y-3">
                {Object.entries(statistics.reports_by_department).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{dept}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(count / statistics.total_reports) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 医生工作量标签页 */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">医生工作量统计</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    医生
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    科室
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总报告数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    已完成
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均用时
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    效率分数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctorWorkload.map((doctor) => (
                  <tr key={doctor.doctor_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doctor.doctor_name}</div>
                      <div className="text-sm text-gray-500">{doctor.doctor_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.total_reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.completed_reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctor.average_completion_time}小时
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${doctor.efficiency_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {doctor.efficiency_score}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 患者分析标签页 */}
      {activeTab === 'patients' && patientAnalytics && (
        <div className="space-y-6">
          {/* 患者概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-group-line text-2xl text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总患者数</p>
                  <p className="text-2xl font-bold text-gray-900">{patientAnalytics.total_patients}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-user-add-line text-2xl text-green-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">新患者</p>
                  <p className="text-2xl font-bold text-gray-900">{patientAnalytics.new_patients}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className="ri-user-follow-line text-2xl text-purple-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">回访患者</p>
                  <p className="text-2xl font-bold text-gray-900">{patientAnalytics.returning_patients}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 患者分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 年龄分布 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">年龄分布</h3>
              <div className="space-y-3">
                {Object.entries(patientAnalytics.patients_by_age_group).map(([age, count]) => (
                  <div key={age} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{age}岁</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(count / patientAnalytics.total_patients) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 性别分布 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">性别分布</h3>
              <div className="space-y-3">
                {Object.entries(patientAnalytics.patients_by_gender).map(([gender, count]) => (
                  <div key={gender} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{gender}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${gender === '男' ? 'bg-blue-600' : 'bg-pink-600'}`}
                          style={{ width: `${(count / patientAnalytics.total_patients) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 趋势分析标签页 */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {charts.map((chart, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{chart.title}</h3>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <i className="ri-line-chart-line text-4xl text-gray-400 mb-2"></i>
                  <p className="text-gray-500">图表组件占位符</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {chart.data.length} 个数据点 | {chart.chart_type.toUpperCase()} 图表
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportAnalytics;
