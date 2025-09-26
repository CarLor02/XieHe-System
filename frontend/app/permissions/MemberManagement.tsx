
'use client';

import { useState } from 'react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  joinDate: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  modelAccess: string[];
  dataAccess: string[];
}

export default function MemberManagement() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'doctor',
    department: '骨科'
  });

  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: '吴医生',
      email: 'wu.doctor@hospital.com',
      role: 'admin',
      department: '骨科',
      joinDate: '2023-10-15',
      status: 'active',
      lastLogin: '2024-03-20 09:30',
      modelAccess: ['术前预测', '支具评估', '智能标注'],
      dataAccess: ['全部数据', '团队数据']
    },
    {
      id: '2',
      name: '张医生',
      email: 'zhang.doctor@hospital.com',
      role: 'senior_doctor',
      department: '骨科',
      joinDate: '2023-11-02',
      status: 'active',
      lastLogin: '2024-03-19 16:45',
      modelAccess: ['术前预测', '智能标注'],
      dataAccess: ['团队数据']
    },
    {
      id: '3',
      name: '李医生',
      email: 'li.doctor@hospital.com',
      role: 'doctor',
      department: '骨科',
      joinDate: '2023-12-10',
      status: 'active',
      lastLogin: '2024-03-18 14:20',
      modelAccess: ['智能标注'],
      dataAccess: ['个人数据']
    },
    {
      id: '4',
      name: '王护士',
      email: 'wang.nurse@hospital.com',
      role: 'staff',
      department: '骨科',
      joinDate: '2024-01-15',
      status: 'active',
      lastLogin: '2024-03-20 08:15',
      modelAccess: [],
      dataAccess: ['个人数据']
    }
  ]);

  const roles = [
    { id: 'admin', name: '管理员', description: '拥有所有权限' },
    { id: 'senior_doctor', name: '主任医师', description: '高级诊断权限' },
    { id: 'doctor', name: '主治医师', description: '基础诊断权限' },
    { id: 'staff', name: '医护人员', description: '基础操作权限' }
  ];

  const getRoleName = (roleId: string) => {
    return roles.find(role => role.id === roleId)?.name || roleId;
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const handleInvite = () => {
    const newMember: Member = {
      id: Date.now().toString(),
      name: '待激活用户',
      email: inviteForm.email,
      role: inviteForm.role,
      department: inviteForm.department,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'inactive',
      lastLogin: '从未登录',
      modelAccess: [],
      dataAccess: ['个人数据']
    };
    setMembers(prev => [...prev, newMember]);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'doctor', department: '骨科' });
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(prev => prev.filter(member => member.id !== memberId));
  };

  const handleUpdateMemberRole = (memberId: string, newRole: string) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, role: newRole } : member
    ));
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">团队成员</h2>
          <p className="text-sm text-gray-600">管理团队成员和权限设置</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
        >
          <i className="ri-user-add-line w-4 h-4 flex items-center justify-center"></i>
          <span>邀请成员</span>
        </button>
      </div>

      {/* 成员列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成员信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  权限
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="ri-user-line w-5 h-5 flex items-center justify-center text-gray-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        <div className="text-xs text-gray-400">{member.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                      disabled={member.id === '1'} // 不允许修改管理员角色
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                      {member.status === 'active' ? '活跃' : '未激活'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      查看权限
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        编辑
                      </button>
                      {member.id !== '1' && ( // 不允许删除管理员
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">邀请团队成员</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line w-6 h-6 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入邮箱地址"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色权限</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  >
                    {roles.filter(role => role.id !== 'admin').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">所属科室</label>
                  <select
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  >
                    <option value="骨科">骨科</option>
                    <option value="心内科">心内科</option>
                    <option value="神经科">神经科</option>
                    <option value="影像科">影像科</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  onClick={handleInvite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  发送邀请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成员详情弹窗 */}
      {showMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">成员权限设置</h2>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line w-6 h-6 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <i className="ri-user-line w-8 h-8 flex items-center justify-center text-gray-600"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedMember.name}</h3>
                    <p className="text-gray-600">{selectedMember.email}</p>
                    <p className="text-sm text-gray-500">{getRoleName(selectedMember.role)} • {selectedMember.department}</p>
                  </div>
                </div>

                {/* 模型权限 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">模型访问权限</h4>
                  <div className="space-y-2">
                    {['术前X线预测术后X线模型', '支具有效性预测模型', '智能标注测量模型'].map((model) => (
                      <label key={model} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          defaultChecked={selectedMember.modelAccess.some(access => model.includes(access.replace('预测', '').replace('评估', '').replace('标注', '')))}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{model}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 数据权限 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">数据访问权限</h4>
                  <div className="space-y-2">
                    {['个人数据', '团队数据', '全部数据'].map((dataType) => (
                      <label key={dataType} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="dataAccess"
                          defaultChecked={selectedMember.dataAccess.includes(dataType)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{dataType}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 操作权限 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">操作权限</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={selectedMember.role !== 'staff'}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">上传影像</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={selectedMember.role === 'admin' || selectedMember.role === 'senior_doctor'}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">编辑患者信息</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={selectedMember.role === 'admin'}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">删除数据</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  取消
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
