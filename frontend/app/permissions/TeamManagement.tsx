
'use client';

import { useState } from 'react';

export default function TeamManagement() {
  const [teamInfo, setTeamInfo] = useState({
    name: '协和吴主任团队',
    description: '专注于骨科疾病的诊断与治疗，运用AI技术提升医疗服务质量',
    department: '骨科',
    hospital: '上海第一人民医院',
    leader: '吴医生',
    createdDate: '2023-10-15',
    memberCount: 8,
    maxMembers: 20
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ ...teamInfo });

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setTeamInfo({ ...editForm });
    setShowEditModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 团队基本信息 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-team-line w-8 h-8 flex items-center justify-center text-blue-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{teamInfo.name}</h2>
              <p className="text-gray-600 mb-2">{teamInfo.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <i className="ri-building-line w-4 h-4 flex items-center justify-center"></i>
                  <span>{teamInfo.hospital}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <i className="ri-stethoscope-line w-4 h-4 flex items-center justify-center"></i>
                  <span>{teamInfo.department}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
          >
            <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
            <span>编辑信息</span>
          </button>
        </div>
      </div>

      {/* 团队统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">团队成员</p>
              <p className="text-2xl font-bold text-gray-900">{teamInfo.memberCount}</p>
              <p className="text-xs text-gray-500">最大 {teamInfo.maxMembers} 人</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-line text-blue-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">活跃模型</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-cpu-line text-green-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">数据存储</p>
              <p className="text-2xl font-bold text-gray-900">2.3TB</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-database-line text-purple-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">本月诊断</p>
              <p className="text-2xl font-bold text-gray-900">847</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-chart-line text-orange-600 w-6 h-6 flex items-center justify-center"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 团队详细信息 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">团队详情</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">团队负责人</label>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-user-line w-5 h-5 flex items-center justify-center text-blue-600"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{teamInfo.leader}</p>
                <p className="text-sm text-gray-600">主治医师</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="ri-calendar-line w-5 h-5 flex items-center justify-center text-gray-600"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{teamInfo.createdDate}</p>
                <p className="text-sm text-gray-600">团队成立日期</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所属科室</label>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-stethoscope-line w-5 h-5 flex items-center justify-center text-green-600"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{teamInfo.department}</p>
                <p className="text-sm text-gray-600">临床科室</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所属医院</label>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="ri-building-line w-5 h-5 flex items-center justify-center text-purple-600"></i>
              </div>
              <div>
                <p className="font-medium text-gray-900">{teamInfo.hospital}</p>
                <p className="text-sm text-gray-600">医疗机构</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑团队信息弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">编辑团队信息</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line w-6 h-6 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">团队名称</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">团队描述</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属科室</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    >
                      <option value="骨科">骨科</option>
                      <option value="心内科">心内科</option>
                      <option value="神经科">神经科</option>
                      <option value="影像科">影像科</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属医院</label>
                    <input
                      type="text"
                      value={editForm.hospital}
                      onChange={(e) => handleInputChange('hospital', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最大成员数</label>
                  <select
                    value={editForm.maxMembers}
                    onChange={(e) => handleInputChange('maxMembers', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  >
                    <option value="10">10人</option>
                    <option value="20">20人</option>
                    <option value="50">50人</option>
                    <option value="100">100人</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  保存更改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
