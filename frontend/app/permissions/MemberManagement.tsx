'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  TeamJoinRequestItem,
  TeamMember,
  TeamMembersResponse,
  TeamSummary,
  getMyTeams,
  getTeamJoinRequests,
  getTeamMembers,
  inviteTeamMember,
  reviewTeamJoinRequest,
} from '@/services/teamService';
import { useUser } from '@/store/authStore';

const ROLE_OPTIONS = [
  { id: 'member', name: '普通成员', description: '参与团队协作' },
  { id: 'doctor', name: '医生', description: '参与日常诊疗协作与数据处理' },
  { id: 'admin', name: '团队管理员', description: '管理团队成员与配置' },
];

const STATUS_BADGE_MAP: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const ROLE_LABEL_MAP: Record<string, string> = {
  admin: '管理员',
  doctor: '医生',
  member: '普通成员',
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN') : '未知';

export default function MemberManagement() {
  const { isAuthenticated, user } = useUser();

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
  const [inviteRole, setInviteRole] = useState('doctor');
  const [inviteMessage, setInviteMessage] = useState('');

  const [joinRequests, setJoinRequests] = useState<TeamJoinRequestItem[]>([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const filteredMembers = useMemo(() => {
    if (!searchKeyword.trim()) return members;
    const keyword = searchKeyword.trim().toLowerCase();
    return members.filter(member =>
      [member.username, member.real_name, member.email]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(keyword))
    );
  }, [members, searchKeyword]);

  const currentMember = useMemo(
    () => members.find(member => (user?.id ? member.id === user.id : false)) ?? null,
    [members, user?.id]
  );

  const isCurrentUserAdmin = currentMember?.role === 'ADMIN';

  // 调试日志
  useEffect(() => {
    console.log('MemberManagement Debug:', {
      userId: user?.id,
      currentMember,
      isCurrentUserAdmin,
      membersCount: members.length,
      selectedTeamId,
    });
  }, [user?.id, currentMember, isCurrentUserAdmin, members.length, selectedTeamId]);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      setError(null);
      const response = await getMyTeams();
      const items = response?.items ?? [];
      setMyTeams(items);
      if (items.length > 0) {
        setSelectedTeamId(prev => prev ?? items[0].id);
      } else {
        setSelectedTeamId(null);
        setMembers([]);
        setCurrentTeam(null);
        setJoinRequests([]);
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
      const response: TeamMembersResponse | undefined = await getTeamMembers(teamId);
      setCurrentTeam(response?.team ?? null);
      setMembers(response?.members ?? []);
    } catch (err) {
      console.error(err);
      setError('获取成员列表失败，请稍后重试');
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadJoinRequests = async (teamId: number) => {
    try {
      setLoadingJoinRequests(true);
      setError(null);
      const response = await getTeamJoinRequests(teamId);
      setJoinRequests(response.items);
    } catch (err) {
      console.error(err);
      setError('获取加入申请列表失败，请稍后重试');
    } finally {
      setLoadingJoinRequests(false);
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

  useEffect(() => {
    if (!selectedTeamId || !isAuthenticated) {
      setJoinRequests([]);
      return;
    }
    // 如果当前成员信息还没加载完成，等待
    if (members.length === 0) {
      return;
    }
    // 只有管理员才加载申请列表
    if (!isCurrentUserAdmin) {
      setJoinRequests([]);
      return;
    }
    loadJoinRequests(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, isCurrentUserAdmin, isAuthenticated, members.length]);

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

  const handleReviewJoinRequest = async (
    request: TeamJoinRequestItem,
    decision: 'approve' | 'reject'
  ) => {
    if (!selectedTeamId) return;

    try {
      setProcessingRequestId(request.id);
      setError(null);
      const result = await reviewTeamJoinRequest(selectedTeamId, request.id, decision);
      setSuccessMessage(result.message || '加入申请已处理');
      await loadJoinRequests(selectedTeamId);
      if (decision === 'approve') {
        await loadMembers(selectedTeamId);
      }
    } catch (err) {
      console.error(err);
      setError('处理加入申请失败，请稍后重试');
    } finally {
      setProcessingRequestId(null);
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
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <i className="ri-error-warning-line text-lg" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <i className="ri-checkbox-circle-line text-lg" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-500 hover:text-emerald-700"
          >
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {/* 管理员提示 */}
      {isCurrentUserAdmin && selectedTeamId && (
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <i className="ri-shield-user-line text-lg text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              您是该团队的管理员，可以审批加入申请和邀请成员
            </span>
          </div>
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
              disabled={loadingTeams || (myTeams?.length ?? 0) === 0}
            >
              {(myTeams?.length ?? 0) === 0 ? (
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
              创建者：{currentTeam.creator_name || '未设置'}
            </div>
          </div>
        </div>
      )}

      {isCurrentUserAdmin && selectedTeamId && (
        <div className="rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <i className="ri-notification-badge-line text-2xl text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-900">待处理加入申请</h3>
                {joinRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {joinRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-amber-700">
                {joinRequests.filter(r => r.status === 'PENDING').length > 0
                  ? '有新的成员申请加入团队，请及时审核。'
                  : '当前暂无待处理的加入申请。'}
              </p>
            </div>
            <button
              onClick={() => selectedTeamId && loadJoinRequests(selectedTeamId)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-50"
              disabled={loadingJoinRequests || !selectedTeamId}
            >
              <i className="ri-refresh-line mr-1" />
              刷新申请
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-white shadow-sm">
            {loadingJoinRequests ? (
              <div className="flex items-center justify-center gap-2 px-6 py-8 text-amber-700">
                <i className="ri-loader-4-line animate-spin text-lg" />
                <span className="text-sm">正在加载加入申请...</span>
              </div>
            ) : joinRequests.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <i className="ri-checkbox-circle-line mb-2 text-4xl text-gray-300" />
                <p className="text-sm text-gray-500">当前暂无加入申请</p>
              </div>
            ) : (
              <div className="divide-y divide-amber-100">
                {joinRequests.map(request => {
                  const isPending = request.status === 'PENDING';
                  return (
                    <div key={request.id} className="flex flex-col gap-3 px-6 py-4 transition hover:bg-amber-50/50 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {request.applicant_real_name || request.applicant_username}
                          </div>
                          <span className="text-xs text-gray-500">
                            ({request.applicant_email || '未填写邮箱'})
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium text-gray-600">申请理由：</span>
                          {request.message || <span className="italic text-gray-400">未填写</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span>
                            <i className="ri-time-line mr-1" />
                            提交于 {formatDateTime(request.requested_at)}
                          </span>
                          {request.reviewed_at && (
                            <span>
                              <i className="ri-check-line mr-1" />
                              审核于 {formatDateTime(request.reviewed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end md:pl-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                            request.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : request.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : request.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {request.status === 'PENDING' && <i className="ri-time-line" />}
                          {request.status === 'APPROVED' && <i className="ri-check-line" />}
                          {request.status === 'REJECTED' && <i className="ri-close-line" />}
                          {request.status === 'PENDING'
                            ? '待审批'
                            : request.status === 'APPROVED'
                            ? '已通过'
                            : request.status === 'REJECTED'
                            ? '已拒绝'
                            : '已撤销'}
                        </span>
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReviewJoinRequest(request, 'approve')}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                              disabled={processingRequestId === request.id}
                            >
                              <i className="ri-checkbox-circle-line" />
                              {processingRequestId === request.id ? '处理中...' : '同意加入'}
                            </button>
                            <button
                              onClick={() => handleReviewJoinRequest(request, 'reject')}
                              className="flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={processingRequestId === request.id}
                            >
                              <i className="ri-close-circle-line" />
                              拒绝申请
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                <tr key="members-loading">
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    正在加载成员列表...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr key="members-empty">
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    暂无成员数据或未找到匹配结果。
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const uniqueKey =
                    member.id ??
                    (member.email ? `email-${member.email}` : null) ??
                    (member.username ? `user-${member.username}` : null) ??
                    `member-${index}`;
                  const badgeClass = STATUS_BADGE_MAP[member.status] || 'bg-gray-100 text-gray-500';
                  return (
                    <tr key={uniqueKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <i className="ri-user-line text-lg" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.real_name || member.username}
                              {member.is_creator && (  
                                <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                                  创建者
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ROLE_LABEL_MAP[member.role] ?? member.role}
                      </td>
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
