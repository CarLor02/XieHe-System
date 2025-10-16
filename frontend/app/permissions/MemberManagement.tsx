'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  TeamMember,
  TeamMembersResponse,
  TeamSummary,
  getMyTeams,
  getTeamMembers,
  inviteTeamMember,
} from '@/services/teamService';
import { useUser } from '@/store/authStore';

const ROLE_OPTIONS = [
  { id: 'member', name: '普通成员', description: '参与日常协作与数据处理' },
  { id: 'admin', name: '团队管理员', description: '管理成员与基础配置' },
  { id: 'guest', name: '访客', description: '可查看但不可编辑' },
];

const STATUS_BADGE_MAP: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN') : '未知';

export default function MemberManagement() {
  const { isAuthenticated } = useUser();

  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchKeyword.trim()) return members;
    const keyword = searchKeyword.trim().toLowerCase();
    return members.filter(member =>
      [member.username, member.real_name, member.email]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(keyword))
    );
  }, [members, searchKeyword]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      setError(null);
      const response = await getMyTeams();
      setMyTeams(response.items);
      if (response.items.length > 0) {
        setSelectedTeamId(prev => prev ?? response.items[0].id);
      } else {
        setSelectedTeamId(null);
        setMembers([]);
        setCurrentTeam(null);
      }
    } catch (err) {
      console.error(err);
      setError('获取团队列表失败，请稍后重试');
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadMembers = async (teamId: number) => {
    try {
      setLoadingMembers(true);
      setError(null);
      const response: TeamMembersResponse = await getTeamMembers(teamId);
      setCurrentTeam(response.team);
      setMembers(response.members);
    } catch (err) {
      console.error(err);
      setError('获取成员列表失败，请稍后重试');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setMyTeams([]);
      setMembers([]);
      setCurrentTeam(null);
      return;
    }
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTeamId) {
      loadMembers(selectedTeamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeamId) return;

    try {
      const message = await inviteTeamMember(
        selectedTeamId,
        inviteEmail,
        inviteRole,
        inviteMessage
      );
      setSuccessMessage(message || '邀请已发送，等待对方确认');
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteMessage('');
      await loadMembers(selectedTeamId);
    } catch (err) {
      console.error(err);
      setError('发送邀请失败，请稍后重试');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        登录后即可查看团队成员并发起邀请。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">选择团队</label>
            <select
              value={selectedTeamId ?? ''}
              onChange={event => setSelectedTeamId(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              disabled={loadingTeams || myTeams.length === 0}
            >
              {myTeams.length === 0 ? (
                <option value="">暂无已加入的团队</option>
              ) : (
                myTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex-1 md:w-64">
              <label className="mb-2 block text-sm font-medium text-gray-700">成员搜索</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={event => setSearchKeyword(event.target.value)}
                placeholder="输入成员姓名或邮箱"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              onClick={() => selectedTeamId && loadMembers(selectedTeamId)}
              className="h-10 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
              disabled={!selectedTeamId}
            >
              刷新
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={!selectedTeamId}
            >
              邀请成员
            </button>
          </div>
        </div>
      </div>

      {currentTeam && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{currentTeam.name}</h3>
              <p className="text-sm text-gray-600">
                成员 {currentTeam.member_count}
                {currentTeam.max_members ? ` / ${currentTeam.max_members}` : ''}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              负责人：{currentTeam.leader_name || '未设置'}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  成员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  加入时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loadingMembers ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    正在加载成员列表...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    暂无成员数据或未找到匹配结果。
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => {
                  const badgeClass = STATUS_BADGE_MAP[member.status] || 'bg-gray-100 text-gray-500';
                  return (
                    <tr key={member.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <i className="ri-user-line text-lg" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.real_name || member.username}
                              {member.is_leader && (
                                <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                                  负责人
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{member.email || '未填写邮箱'}</div>
                            {member.department && (
                              <div className="text-xs text-gray-400">{member.department}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.role}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                          {member.status === 'active'
                            ? '活跃'
                            : member.status === 'invited'
                            ? '已邀请'
                            : member.status === 'pending'
                            ? '待审核'
                            : '已停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(member.joined_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inviteModalOpen && selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">邀请新成员</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-gray-400 transition hover:text-gray-600"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  required
                  placeholder="输入受邀者邮箱"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">团队角色</label>
                <select
                  value={inviteRole}
                  onChange={event => setInviteRole(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}（{option.description}）
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">邀请信息（可选）</label>
                <textarea
                  value={inviteMessage}
                  onChange={event => setInviteMessage(event.target.value)}
                  rows={3}
                  placeholder="可以补充邀请说明或合作背景"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  发送邀请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
