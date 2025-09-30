'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
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

      <main className="ml-64 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">添加患者</h1>
              <p className="text-gray-600">创建新的患者档案</p>
            </div>
            <Link
              href="/patients"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              返回患者列表
            </Link>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-green-800">
              ✅ 患者创建成功！正在跳转到患者列表...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">❌ 错误: {error}</div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                基本信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    placeholder="自动生成"
                  />
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    姓名 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入患者姓名"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    性别 *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">请选择性别</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="birth_date"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    出生日期 *
                  </label>
                  <input
                    type="date"
                    id="birth_date"
                    name="birth_date"
                    required
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="id_card"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    身份证号
                  </label>
                  <input
                    type="text"
                    id="id_card"
                    name="id_card"
                    value={formData.id_card}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入身份证号"
                  />
                </div>
              </div>
            </div>

            {/* 联系信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                联系信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    手机号码
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入手机号码"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    邮箱地址
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入邮箱地址"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    联系地址
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入联系地址"
                  />
                </div>
              </div>
            </div>

            {/* 紧急联系人 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                紧急联系人
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入紧急联系人姓名"
                  />
                </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入紧急联系人电话"
                  />
                </div>
              </div>
            </div>

            {/* 其他信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                其他信息
              </h3>
              <div className="space-y-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入医保号"
                  />
                </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入病史或其他备注信息"
                  />
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/patients"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '创建中...' : '创建患者'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
