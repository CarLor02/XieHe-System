'use client';

import BirthDatePicker from '@/components/BirthDatePicker';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
import {
  extractBirthDateFromIdCard,
  extractGenderFromIdCard,
  validateIdCard,
} from '@/utils/idCardUtils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PatientFormData {
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
  medical_history: string;
}

// 生成患者ID的函数
function generatePatientId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0');
  return `P${year}${month}${day}${random}`;
}

export default function AddPatientPage() {
  const [formData, setFormData] = useState<PatientFormData>({
    patient_id: generatePatientId(),
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
    medical_history: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const { isAuthenticated } = useUser();
  const router = useRouter();

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理身份证输入，自动提取出生日期和性别
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idCard = e.target.value.trim();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const client = createAuthenticatedClient();
      const response = await client.post('/api/v1/patients/', formData);

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/patients');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      const errorMessage =
        err.response?.data?.message || err.message || '创建患者失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>正在检查认证状态...</div>;
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
                <Link
                  href="/patients"
                  className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow flex items-center justify-center group"
                  title="返回患者列表"
                >
                  <i className="ri-arrow-left-line text-lg group-hover:scale-110 transition-transform"></i>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">添加患者</h1>
                  <p className="text-gray-600 mt-1">创建新的患者档案</p>
                </div>
              </div>
            </div>
          </div>

          {/* 成功提示 */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <i className="ri-checkbox-circle-fill text-green-600 text-xl"></i>
                <span className="text-green-800 font-medium">患者创建成功！正在跳转到患者列表...</span>
              </div>
            </div>
          )}

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
            <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
              {/* 基本信息 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 姓名 - 占1列 */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入患者姓名"
                    />
                  </div>

                  {/* 性别 - 占1列 */}
                  <div>
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      性别 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="">请选择性别</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>

                  {/* 患者编号 - 占1列 */}
                  <div>
                    <label
                      htmlFor="patient_id"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      患者编号
                    </label>
                    <input
                      type="text"
                      id="patient_id"
                      name="patient_id"
                      value={formData.patient_id}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="系统自动生成"
                    />
                  </div>

                  {/* 身份证号 - 占2列 */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="id_card"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      身份证号
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="id_card"
                        name="id_card"
                        value={formData.id_card}
                        onChange={handleIdCardChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-colors ${idCardError
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
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      联系电话 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入手机号码"
                    />
                  </div>

                  {/* 电子邮箱 - 占1列 */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      电子邮箱
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="example@email.com"
                    />
                  </div>

                  {/* 医保号 - 占1列 */}
                  <div>
                    <label
                      htmlFor="insurance_number"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      医保号
                    </label>
                    <input
                      type="text"
                      id="insurance_number"
                      name="insurance_number"
                      value={formData.insurance_number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入医保卡号"
                    />
                  </div>

                  {/* 家庭地址 - 占3列（全宽） */}
                  <div className="md:col-span-3">
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      家庭地址
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入家庭地址"
                    />
                  </div>
                </div>
              </div>

              {/* 紧急联系人 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  紧急联系人
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 紧急联系人姓名 */}
                  <div>
                    <label
                      htmlFor="emergency_contact_name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      联系人姓名
                    </label>
                    <input
                      type="text"
                      id="emergency_contact_name"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入紧急联系人姓名"
                    />
                  </div>

                  {/* 紧急联系电话 */}
                  <div>
                    <label
                      htmlFor="emergency_contact_phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      联系人电话
                    </label>
                    <input
                      type="tel"
                      id="emergency_contact_phone"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="请输入紧急联系电话"
                    />
                  </div>
                </div>
              </div>

              {/* 其他信息 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  其他信息
                </h3>
                <div>
                  <label
                    htmlFor="medical_history"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    病史备注
                  </label>
                  <textarea
                    id="medical_history"
                    name="medical_history"
                    rows={4}
                    value={formData.medical_history}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="请输入病史或其他备注信息"
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <Link
                  href="/patients"
                  className="flex items-center justify-center space-x-2 px-5 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-close-line"></i>
                  <span>取消</span>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>创建中...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      <span>创建患者</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
