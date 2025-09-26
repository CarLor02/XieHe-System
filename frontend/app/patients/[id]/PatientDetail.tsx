'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PatientDetail {
  id: string;
  name: string;
  patientId: string;
  gender: string;
  birthDate: string;
  age: number;
  phone: string;
  idCard: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  lastVisit: string;
  totalExams: number;
  status: 'active' | 'inactive';
  medicalHistory: string[];
  diagnoses: {
    AIS: { status: boolean; value: string; description: string };
    DS: { status: boolean; value: string; description: string };
    CS: { status: boolean; value: string; description: string };
    NMS: { status: boolean; value: string; description: string };
  };
}

interface ExamRecord {
  id: string;
  date: string;
  type: string;
  doctor: string;
  diagnosis: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const mockPatientDetail: PatientDetail = {
  id: '1',
  name: '张三',
  patientId: 'P202401001',
  gender: '男',
  birthDate: '1985-03-15',
  age: 39,
  phone: '138****1234',
  idCard: '320102198503159527',
  address: '江苏省南京市玄武区中山路123号',
  emergencyContact: '李女士（妻子）',
  emergencyPhone: '139****5678',
  lastVisit: '2024-01-15',
  totalExams: 3,
  status: 'active',
  medicalHistory: ['腰椎间盘突出', '颈椎病'],
  diagnoses: {
    AIS: { status: true, value: '250', description: '钙化积分 250' },
    DS: { status: false, value: '阴性', description: '深静脉血栓阴性' },
    CS: { status: true, value: '70%', description: '冠状动脉狭窄 70%' },
    NMS: { status: true, value: 'L4-L5突出', description: '椎间盘突出' },
  },
};

const mockExamRecords: ExamRecord[] = [
  {
    id: '1',
    date: '2025-01-15',
    type: '正位X光片',
    doctor: '吴医生',
    diagnosis: '轻度脊柱侧弯',
    status: 'completed',
  },
  {
    id: '2',
    date: '2024-01-10',
    type: '侧位X光片',
    doctor: '吴医生',
    diagnosis: '腰椎生理曲度变直',
    status: 'completed',
  },
  {
    id: '3',
    date: '2024-01-05',
    type: '体态照片',
    doctor: '吴医生',
    diagnosis: '高低肩，骨盆倾斜',
    status: 'completed',
  },
];

export default function PatientDetail({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingDiagnoses, setIsEditingDiagnoses] = useState(false);
  const [diagnoses, setDiagnoses] = useState(mockPatientDetail.diagnoses);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">患者详情</h1>
                <p className="text-gray-600 mt-1">查看和管理患者完整信息</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Link
                href={`/patients/${patientId}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                <span>编辑信息</span>
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                <span>删除患者</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息卡片 */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  基本信息
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    mockPatientDetail.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {mockPatientDetail.status === 'active' ? '活跃' : '非活跃'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      姓名
                    </label>
                    <p className="text-gray-900 font-medium">
                      {mockPatientDetail.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      患者ID
                    </label>
                    <p className="text-gray-900">
                      {mockPatientDetail.patientId}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      性别
                    </label>
                    <p className="text-gray-900">{mockPatientDetail.gender}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      出生日期
                    </label>
                    <p className="text-gray-900">
                      {mockPatientDetail.birthDate}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      年龄
                    </label>
                    <p className="text-gray-900">{mockPatientDetail.age} 岁</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      联系电话
                    </label>
                    <p className="text-gray-900">{mockPatientDetail.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      身份证号
                    </label>
                    <p className="text-gray-900">{mockPatientDetail.idCard}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      家庭地址
                    </label>
                    <p className="text-gray-900">{mockPatientDetail.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      紧急联系人
                    </label>
                    <p className="text-gray-900">
                      {mockPatientDetail.emergencyContact}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      紧急联系电话
                    </label>
                    <p className="text-gray-900">
                      {mockPatientDetail.emergencyPhone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 统计信息卡片 */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  就诊统计
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">总检查次数</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {mockPatientDetail.totalExams}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">最近就诊</span>
                    <span className="text-gray-900">
                      {mockPatientDetail.lastVisit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">建档时间</span>
                    <span className="text-gray-900">2024-01-01</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  医疗信息
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    既往病史
                  </label>
                  <div className="space-y-1">
                    {mockPatientDetail.medicalHistory.map((history, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded mr-2 mb-1"
                      >
                        {history}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 临床诊断卡片 */}
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">临床诊断</h3>
              <button
                onClick={() => setIsEditingDiagnoses(!isEditingDiagnoses)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
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
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">检查记录</h3>
              <Link
                href={`/upload?returnTo=/patients/${patientId}&patientId=${mockPatientDetail.patientId}&patientName=${encodeURIComponent(mockPatientDetail.name)}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
                <span>新增检查</span>
              </Link>
            </div>

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
                      主治医生
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                      诊断结果
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
                  {mockExamRecords.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {record.date}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {record.type}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {record.doctor}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {record.diagnosis}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            record.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'pending'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {record.status === 'completed'
                            ? '已完成'
                            : record.status === 'pending'
                              ? '进行中'
                              : '已取消'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/imaging?exam=${record.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm whitespace-nowrap"
                          >
                            查看影像
                          </Link>
                          <button className="text-green-600 hover:text-green-700 text-sm whitespace-nowrap">
                            下载报告
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                确定要删除患者 "{mockPatientDetail.name}"
                的所有信息吗？此操作不可恢复。
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-7
                  hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    router.push('/patients');
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
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
