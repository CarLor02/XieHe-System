'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  gender: string;
  birth_date: string;
  age?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  id_card?: string;
  insurance_number?: string;
  status: string;
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

// API调用函数
const fetchPatients = async (page: number = 1, pageSize: number = 10, search?: string, gender?: string): Promise<PatientListResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (search) params.append('search', search);
    if (gender && gender !== 'all') params.append('gender', gender);

    const response = await fetch(`/api/v1/patients?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('获取患者列表失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取患者列表错误:', error);
    throw error;
  }
};

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const patientsPerPage = 10;

  // 加载患者数据
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatients(currentPage, patientsPerPage, searchTerm || undefined, selectedGender);
      setPatients(data.patients);
      setTotalPatients(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载患者数据失败');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和依赖变化时重新加载
  useEffect(() => {
    loadPatients();
  }, [currentPage, searchTerm, selectedGender]);

  // 由于我们现在使用API分页，不需要前端过滤和分页
  const displayedPatients = patients;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">患者管理</h1>
              <p className="text-gray-600 mt-1">管理和查看所有患者信息</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-user-add-line w-4 h-4 flex items-center justify-center"></i>
                <span>新增患者</span>
              </button>
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 whitespace-nowrap">
                <i className="ri-upload-line w-4 h-4 flex items-center justify-center"></i>
                <span>数据同步</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <i className="ri-search-line w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="搜索患者姓名、ID或手机号"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
                  />
                </div>

                <select
                  value={selectedGender}
                  onChange={e => setSelectedGender(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                >
                  <option value="all">全部性别</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>

              <div className="text-sm text-gray-500">
                共 {totalPatients} 位患者
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">加载中...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadPatients}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  重试
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        患者信息
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        性别
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        出生日期
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        联系电话
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        创建时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        状态
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedPatients.map(patient => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {patient.patient_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {patient.gender}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {patient.birth_date} ({patient.age}岁)
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {patient.phone}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm whitespace-nowrap"
                          >
                            查看详情
                          </Link>
                          <Link
                            href={`/patients/${patient.id}/edit`}
                            className="text-green-600 hover:text-green-700 text-sm whitespace-nowrap"
                          >
                            编辑
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      显示第 {currentPage} 页，共 {totalPages} 页，总计 {totalPatients} 条记录
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        上一页
                      </button>

                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 border rounded text-sm ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">新增患者</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line w-5 h-5 flex items-center justify-center"></i>
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性别
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8">
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    出生日期
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-7
                    00 whitespace-nowrap"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
