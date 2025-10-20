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

interface Study {
  id: number;
  study_date: string;
  modality: string;
  description: string;
  status: string;
  patient_name?: string;
}

const defaultDiagnoses = {
  AIS: { status: false, value: '未检查', description: '钙化积分未检查' },
  DS: { status: false, value: '未检查', description: '深静脉血栓未检查' },
  CS: { status: false, value: '未检查', description: '冠状动脉狭窄未检查' },
  NMS: { status: false, value: '未检查', description: '神经肌肉系统未检查' },
};

export default function PatientDetail({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingDiagnoses, setIsEditingDiagnoses] = useState(false);
  const [diagnoses, setDiagnoses] = useState(defaultDiagnoses);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [studiesLoading, setStudiesLoading] = useState(true);
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

  // 从后端加载检查记录
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        setStudiesLoading(true);
        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/studies/?patient_id=${patientId}&page=1&page_size=10`);
        setStudies(response.data.studies || []);
      } catch (err: any) {
        console.error('获取检查记录失败:', err);
        setStudies([]);
      } finally {
        setStudiesLoading(false);
      }
    };

    if (patientId) {
      fetchStudies();
    }
  }, [patientId]);

  const updateDiagnosis = (
    type: keyof typeof diagnoses,
    field: 'status' | 'value',
    value: any
  ) => {
    setDiagnoses(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const getDiagnosisInfo = (type: string) => {
    const diagnosisMap = {
      AIS: {
        fullName: '钙化积分评估',
        description: '量化患者冠状动脉中钙化斑块的总体积，评估心血管疾病风险',
        normalRange: '正常: <100, 轻度: 100-299, 中度: 300-399, 重度: ≥400',
      },
      DS: {
        fullName: '深静脉血栓检查',
        description: '诊断患者深静脉里是否形成了血块',
        normalRange: '正常: 阴性, 异常: 阳性',
      },
      CS: {
        fullName: '冠状动脉狭窄评估',
        description: '评估患者心脏冠脉血管堵塞程度',
        normalRange: '正常: <50%, 轻度: 50-70%, 重度: >70%',
      },
      NMS: {
        fullName: '神经肌肉系统检查',
        description: '诊断患者脊柱问题，是否压迫神经',
        normalRange: '正常: 无突出, 异常: 椎间盘突出/神经压迫',
      },
    };
    return diagnosisMap[type as keyof typeof diagnosisMap];
  };

  const getDiagnosisStatusColor = (type: string, status: boolean) => {
    if (type === 'DS') {
      return status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    }
    return status
      ? 'bg-orange-100 text-orange-800'
      : 'bg-gray-100 text-gray-800';
  };

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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
                href={`/patients/${patientId}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors shadow-sm hover:shadow"
              >
                <i className="ri-edit-line"></i>
                <span>编辑信息</span>
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors shadow-sm hover:shadow"
              >
                <i className="ri-delete-bin-line"></i>
                <span>删除患者</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息卡片 */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    patient.status === 'active'
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
                    <span className="text-gray-600">总检查次数</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {studiesLoading ? '-' : studies.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">最近就诊</span>
                    <span className="text-gray-900">
                      {studies.length > 0 && studies[0].study_date
                        ? new Date(studies[0].study_date).toLocaleDateString('zh-CN')
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

          {/* 临床诊断卡片 */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">临床诊断</h3>
              <button
                onClick={() => setIsEditingDiagnoses(!isEditingDiagnoses)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 transition-colors"
              >
                <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                <span>{isEditingDiagnoses ? '完成编辑' : '编辑诊断'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {Object.entries(diagnoses).map(([type, diagnosis]) => {
                const info = getDiagnosisInfo(type);
                return (
                  <div
                    key={type}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {type}
                        </span>
                        {isEditingDiagnoses ? (
                          <input
                            type="checkbox"
                            checked={diagnosis.status}
                            onChange={e =>
                              updateDiagnosis(
                                type as keyof typeof diagnoses,
                                'status',
                                e.target.checked
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getDiagnosisStatusColor(type, diagnosis.status)}`}
                          >
                            {diagnosis.status ? '异常' : '正常'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        {info?.fullName}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {info?.description}
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        检查结果
                      </label>
                      {isEditingDiagnoses ? (
                        <input
                          type="text"
                          value={diagnosis.value}
                          onChange={e =>
                            updateDiagnosis(
                              type as keyof typeof diagnoses,
                              'value',
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`输入${type}检查结果`}
                        />
                      ) : (
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-sm font-medium text-gray-900">
                            {diagnosis.value}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      <span className="font-medium">参考范围:</span>{' '}
                      {info?.normalRange}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 检查记录 */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">检查记录</h3>
              <Link
                href={`/upload?returnTo=/patients/${patientId}&patientId=${patient.patient_id}&patientName=${encodeURIComponent(patient.name)}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
                <span>新增检查</span>
              </Link>
            </div>

            {studiesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">加载检查记录中...</div>
              </div>
            ) : studies.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">暂无检查记录</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        检查日期
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        检查类型
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        检查描述
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
                    {studies.map(study => (
                      <tr key={study.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {study.study_date ? new Date(study.study_date).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {study.modality || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {study.description || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              study.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : study.status === 'pending'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {study.status === 'completed'
                              ? '已完成'
                              : study.status === 'pending'
                                ? '进行中'
                                : study.status || '未知'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/studies/${study.id}`}
                              className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                            >
                              查看详情
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
