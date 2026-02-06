'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createAuthenticatedClient } from '@/store/authStore';

// 患者详情数据接口
interface PatientDetail {
  id: number;
  patient_id: string;
  name: string;
  gender: string;
  birth_date: string;
  age: number;
  phone: string;
  email: string;
  id_card: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  insurance_number: string;
  medical_history: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ImageFile {
  id: number;
  file_uuid: string;
  original_filename: string;
  file_type: string;
  modality: string;
  study_date: string;
  status: string;
}

export default function PatientDetail({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从后端加载患者数据
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/patients/${patientId}`);
        setPatient(response.data);
        setError(null);
      } catch (err: any) {
        console.error('获取患者详情失败:', err);
        setError(err.response?.data?.detail || '获取患者详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  // 从后端加载影像记录
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        const client = createAuthenticatedClient();
        // 通过患者ID获取影像文件列表
        const response = await client.get(`/api/v1/image-files/patient/${patientId}?page=1&page_size=20`);
        setImageFiles(response.data.items || []);
      } catch (err: any) {
        console.error('获取影像记录失败:', err);
        setImageFiles([]);
      } finally {
        setImagesLoading(false);
      }
    };

    if (patientId) {
      fetchImages();
    }
  }, [patientId]);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 错误状态
  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-red-600"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
              <p className="text-gray-600 mb-4">{error || '患者不存在'}</p>
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                返回
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-6">
          {/* 页面标题和操作栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow flex items-center justify-center group"
                title="返回上一页"
              >
                <i className="ri-arrow-left-line text-lg group-hover:scale-110 transition-transform"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">患者详情</h1>
                <p className="text-gray-600 mt-1">查看和管理患者完整信息</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Link
                href={`/patients/edit?id=${patientId}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
              >
                编辑信息
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm hover:shadow"
              >
                删除患者
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息卡片 */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${patient.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {patient.status === 'active' ? '活跃' : '非活跃'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    姓名
                  </label>
                  <p className="text-gray-900 font-medium">{patient.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    患者编号
                  </label>
                  <p className="text-gray-900">{patient.patient_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    性别
                  </label>
                  <p className="text-gray-900">{patient.gender}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    出生日期
                  </label>
                  <p className="text-gray-900">{patient.birth_date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    年龄
                  </label>
                  <p className="text-gray-900">{patient.age} 岁</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    联系电话
                  </label>
                  <p className="text-gray-900">{patient.phone || '未填写'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    电子邮箱
                  </label>
                  <p className="text-gray-900 break-all">{patient.email || '未填写'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    身份证号
                  </label>
                  <p className="text-gray-900">{patient.id_card || '未填写'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    医保卡号
                  </label>
                  <p className="text-gray-900">{patient.insurance_number || '未填写'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    家庭地址
                  </label>
                  <p className="text-gray-900">{patient.address || '未填写'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    紧急联系人
                  </label>
                  <p className="text-gray-900">
                    {patient.emergency_contact_name || '未填写'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    紧急联系电话
                  </label>
                  <p className="text-gray-900">
                    {patient.emergency_contact_phone || '未填写'}
                  </p>
                </div>
              </div>
            </div>

            {/* 统计信息卡片 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  就诊统计
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">影像数量</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {imagesLoading ? '-' : imageFiles.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">最近上传</span>
                    <span className="text-gray-900">
                      {imageFiles.length > 0 && imageFiles[0].study_date
                        ? new Date(imageFiles[0].study_date).toLocaleDateString('zh-CN')
                        : '暂无记录'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">建档时间</span>
                    <span className="text-gray-900">
                      {patient.created_at
                        ? new Date(patient.created_at).toLocaleDateString('zh-CN')
                        : '未知'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  医疗信息
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    既往病史
                  </label>
                  {patient.medical_history ? (
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">
                      {patient.medical_history}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm">暂无病史记录</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 影像记录 */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">影像记录</h3>
              <Link
                href={`/upload?returnTo=/patients/detail?id=${patientId}&patientId=${patient.patient_id}&patientName=${encodeURIComponent(patient.name)}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                上传影像
              </Link>
            </div>

            {imagesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">加载影像记录中...</div>
              </div>
            ) : imageFiles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">暂无影像记录</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        上传日期
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        文件名
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        影像类型
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
                    {imageFiles.map(imageFile => (
                      <tr key={imageFile.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {imageFile.study_date ? new Date(imageFile.study_date).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {imageFile.original_filename || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {imageFile.modality || imageFile.file_type || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${imageFile.status === 'UPLOADED'
                              ? 'bg-green-100 text-green-800'
                              : imageFile.status === 'PROCESSING'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {imageFile.status === 'UPLOADED'
                              ? '已上传'
                              : imageFile.status === 'PROCESSING'
                                ? '处理中'
                                : imageFile.status || '未知'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/imaging/viewer?id=${imageFile.id}`}
                              className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                            >
                              查看影像
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 删除确认弹窗 */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-alert-line w-5 h-5 flex items-center justify-center text-red-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  确认删除
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                确定要删除患者 "{patient.name}"
                的所有信息吗？此操作不可恢复。
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    try {
                      const client = createAuthenticatedClient();
                      await client.delete(`/api/v1/patients/${patientId}`);
                      router.push('/patients');
                    } catch (err: any) {
                      console.error('删除患者失败:', err);
                      alert(err.response?.data?.detail || '删除患者失败');
                      setShowDeleteModal(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
