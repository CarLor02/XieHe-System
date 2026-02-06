'use client';

/**
 * 增强版患者管理页面
 *
 * 患者列表展示、搜索、筛选、新增、编辑功能
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PatientSearchFilter, {
  SearchFilters,
} from '@/components/patients/PatientSearchFilter';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// 类型定义
interface Patient {
  id: number;
  patient_id: string;
  name: string;
  gender: string;
  birth_date: string;
  age: number;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 模拟API调用
const mockPatients: Patient[] = [
  {
    id: 1,
    patient_id: 'P001',
    name: '张三',
    gender: '男',
    birth_date: '1980-05-15',
    age: 44,
    phone: '13800138001',
    email: 'zhangsan@example.com',
    address: '北京市朝阳区',
    is_active: true,
    created_at: '2024-01-01T10:00:00',
    updated_at: '2024-01-01T10:00:00',
  },
  {
    id: 2,
    patient_id: 'P002',
    name: '王五',
    gender: '女',
    birth_date: '1990-08-20',
    age: 34,
    phone: '13800138003',
    email: 'wangwu@example.com',
    address: '上海市浦东新区',
    is_active: true,
    created_at: '2024-01-02T10:00:00',
    updated_at: '2024-01-02T10:00:00',
  },
  {
    id: 3,
    patient_id: 'P003',
    name: '李四',
    gender: '男',
    birth_date: '1975-12-10',
    age: 49,
    phone: '13800138005',
    email: 'lisi@example.com',
    address: '广州市天河区',
    is_active: false,
    created_at: '2024-01-03T10:00:00',
    updated_at: '2024-01-03T10:00:00',
  },
];

const fetchPatients = async (params: {
  page?: number;
  page_size?: number;
  search?: string;
  gender?: string;
  is_active?: boolean;
}): Promise<PatientListResponse> => {
  try {
    const { createAuthenticatedClient } = await import('@/store/authStore');
    const client = createAuthenticatedClient();

    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size)
      queryParams.append('page_size', params.page_size.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.gender) queryParams.append('gender', params.gender);
    if (params.is_active !== undefined)
      queryParams.append('is_active', params.is_active.toString());

    const response = await client.get(`/api/v1/patients/?${queryParams}`);

    if (response.data && response.data.patients) {
      // 转换API数据格式
      const patients = response.data.patients.map((patient: any) => ({
        id: patient.id,
        patient_id: patient.patient_id || `P${patient.id}`,
        name: patient.name || '未知患者',
        gender: patient.gender || 'unknown',
        age: patient.age || 0,
        birth_date: patient.birth_date || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        medical_history: patient.medical_history || '',
        allergies: patient.allergies || '',
        current_medications: patient.current_medications || '',
        insurance_info: patient.insurance_info || '',
        is_active: patient.is_active !== false,
        created_at: patient.created_at || '',
        updated_at: patient.updated_at || '',
      }));

      return {
        patients,
        total: response.data.total || patients.length,
        page: response.data.page || params.page || 1,
        page_size: response.data.page_size || params.page_size || 20,
        total_pages:
          response.data.total_pages ||
          Math.ceil(
            (response.data.total || patients.length) / (params.page_size || 20)
          ),
      };
    } else {
      return {
        patients: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 20,
        total_pages: 0,
      };
    }
  } catch (error) {
    console.error('获取患者数据失败:', error);
    return {
      patients: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 20,
      total_pages: 0,
    };
  }
};

export default function EnhancedPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 加载患者列表
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        page_size: 20,
      };

      if (filters.search) params.search = filters.search;
      if (filters.gender) params.gender = filters.gender;
      if (filters.isActive !== undefined) params.is_active = filters.isActive;

      const response = await fetchPatients(params);

      setPatients(response.patients);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      setError('加载患者列表失败');
      console.error('Load patients error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和筛选条件变化时重新加载
  useEffect(() => {
    loadPatients();
  }, [currentPage, filters]);

  // 处理筛选条件变化
  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    loadPatients();
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取性别标签样式
  const getGenderBadge = (gender: string) => {
    const colors = {
      男: 'bg-blue-100 text-blue-800',
      女: 'bg-pink-100 text-pink-800',
      未知: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[gender as keyof typeof colors] || colors['未知']}`}
      >
        {gender}
      </span>
    );
  };

  // 获取状态标签
  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
      >
        {isActive ? '正常' : '停用'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                患者管理
              </h1>
              <p className="text-gray-600">
                管理患者基本信息、档案记录和就诊历史
              </p>
            </div>
            <button
              onClick={() => router.push('/patients/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <i className="ri-user-add-line w-4 h-4"></i>
              <span>新增患者</span>
            </button>
          </div>

          {/* 搜索和筛选 */}
          <PatientSearchFilter
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            onReset={handleReset}
            loading={loading}
            resultCount={total}
          />

          {/* 患者列表 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  患者列表
                </h3>
                <div className="text-sm text-gray-600">共 {total} 名患者</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">加载中...</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        患者ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        姓名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        性别
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        年龄
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        联系电话
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          暂无患者数据
                        </td>
                      </tr>
                    ) : (
                      patients.map(patient => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {patient.patient_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {patient.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getGenderBadge(patient.gender)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {patient.age}岁
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {patient.phone || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(patient.is_active)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(patient.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <Link
                                href={`/patients/detail?id=${patient.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                查看
                              </Link>
                              <Link
                                href={`/patients/edit?id=${patient.id}`}
                                className="text-green-600 hover:text-green-900"
                              >
                                编辑
                              </Link>
                              <button className="text-red-600 hover:text-red-900">
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  第 {currentPage} 页，共 {totalPages} 页
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
