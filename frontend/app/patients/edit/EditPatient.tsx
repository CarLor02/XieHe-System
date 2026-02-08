'use client';

import BirthDatePicker from '@/components/BirthDatePicker';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createAuthenticatedClient } from '@/store/authStore';
import {
  extractBirthDateFromIdCard,
  extractGenderFromIdCard,
  validateIdCard,
} from '@/utils/idCardUtils';
import { extractData } from '@/utils/apiResponseHandler';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface PatientForm {
  patient_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  email: string;
  id_card: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  insurance_number: string;
}

export default function EditPatient({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [formData, setFormData] = useState<PatientForm>({
    patient_id: '',
    name: '',
    gender: '',
    birth_date: '',
    phone: '',
    email: '',
    id_card: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_number: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // 加载患者数据
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = createAuthenticatedClient();
        const response = await client.get(`/api/v1/patients/${patientId}`);

        // 使用 extractData 提取患者数据
        const patient = extractData<any>(response);
        setFormData({
          patient_id: patient.patient_id || '',
          name: patient.name || '',
          gender: patient.gender || '',
          birth_date: patient.birth_date || '',
          phone: patient.phone || '',
          email: patient.email || '',
          id_card: patient.id_card || '',
          address: patient.address || '',
          emergency_contact_name: patient.emergency_contact_name || '',
          emergency_contact_phone: patient.emergency_contact_phone || '',
          insurance_number: patient.insurance_number || '',
        });
      } catch (err: any) {
        console.error('Failed to fetch patient data:', err);
        setError(err.response?.data?.message || '加载患者信息失败');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const handleInputChange = (field: keyof PatientForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理身份证输入，自动提取出生日期和性别
  const handleIdCardChange = (value: string) => {
    const idCard = value.trim();

    setFormData(prev => ({
      ...prev,
      id_card: idCard,
    }));

    // 清除之前的错误
    setIdCardError(null);

    // 如果身份证号长度足够，尝试提取信息
    if (idCard.length === 15 || idCard.length === 18) {
      // 验证身份证格式
      if (!validateIdCard(idCard)) {
        setIdCardError('身份证号格式不正确');
        return;
      }

      // 提取出生日期
      const birthDate = extractBirthDateFromIdCard(idCard);
      if (birthDate) {
        setFormData(prev => ({
          ...prev,
          birth_date: birthDate,
        }));
      }

      // 提取性别
      const gender = extractGenderFromIdCard(idCard);
      if (gender) {
        setFormData(prev => ({
          ...prev,
          gender: gender,
        }));
      }
    }
  };

  // 处理出生日期变化
  const handleBirthDateChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      birth_date: date,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const client = createAuthenticatedClient();
      const response = await client.put(`/api/v1/patients/${patientId}`, formData);

      if (response.status === 200) {
        setShowSaveModal(true);
        // 2秒后跳转回患者列表
        setTimeout(() => {
          router.push('/patients');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to update patient:', err);
      setError(err.response?.data?.message || '更新患者信息失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow flex items-center justify-center group"
                  title="返回患者详情"
                >
                  <i className="ri-arrow-left-line text-lg group-hover:scale-110 transition-transform"></i>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">编辑患者信息</h1>
                  <p className="text-gray-600 mt-1">修改和更新患者详细信息</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      <span>保存修改</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <i className="ri-error-warning-fill text-red-600 text-xl"></i>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* 表单卡片 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <form className="divide-y divide-gray-200">
              {/* 基本信息 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  基本信息
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 姓名 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入患者姓名"
                      required
                    />
                  </div>

                  {/* 性别 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性别 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={e => handleInputChange('gender', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="">请选择性别</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>

                  {/* 患者编号 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      患者编号
                    </label>
                    <input
                      type="text"
                      value={formData.patient_id}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="系统自动生成"
                    />
                  </div>

                  {/* 身份证号 - 占2列 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      身份证号
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        (输入后自动提取出生日期和性别)
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.id_card}
                        onChange={e => handleIdCardChange(e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${idCardError
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        placeholder="请输入18位身份证号码"
                        maxLength={18}
                      />
                      {formData.id_card && !idCardError && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <i className="ri-checkbox-circle-fill text-green-500"></i>
                        </div>
                      )}
                    </div>
                    {idCardError && (
                      <p className="mt-2 text-sm text-red-600">
                        {idCardError}
                      </p>
                    )}
                  </div>

                  {/* 出生日期 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      出生日期 <span className="text-red-500">*</span>
                    </label>
                    <BirthDatePicker
                      value={formData.birth_date}
                      onChange={handleBirthDateChange}
                      required={true}
                    />
                  </div>
                </div>
              </div>

              {/* 联系信息 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  联系信息
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 联系电话 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入手机号码"
                      required
                    />
                  </div>

                  {/* 电子邮箱 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      电子邮箱
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="example@email.com"
                    />
                  </div>

                  {/* 医保号 - 占1列 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      医保号
                    </label>
                    <input
                      type="text"
                      value={formData.insurance_number}
                      onChange={e =>
                        handleInputChange('insurance_number', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入医保卡号"
                    />
                  </div>

                  {/* 家庭地址 - 占3列（全宽） */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      家庭地址
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入家庭地址"
                    />
                  </div>
                </div>
              </div>

              {/* 紧急联系人信息 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  紧急联系人
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 紧急联系人姓名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系人姓名
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={e =>
                        handleInputChange('emergency_contact_name', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入紧急联系人姓名"
                    />
                  </div>

                  {/* 紧急联系电话 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系人电话
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={e =>
                        handleInputChange('emergency_contact_phone', e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入紧急联系电话"
                    />
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* 保存确认弹窗 */}
          {showSaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-check-line text-green-600 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    保存成功
                  </h3>
                </div>

                <p className="text-gray-600 mb-6">患者信息已成功更新！</p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      router.push(`/patients/detail?id=${patientId}`);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center justify-center"
                  >
                    返回详情页
                  </button>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center justify-center"
                  >
                    继续编辑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
