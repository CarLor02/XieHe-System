'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import {
  TeamJoinRequestItem,
  TeamMember,
  TeamMembersResponse,
  TeamSummary,
  applyToJoinTeam,
  cancelTeamJoinRequest,
  createTeam,
  getMyTeams,
  getTeamJoinRequests,
  getTeamMembers,
  reviewTeamJoinRequest,
  searchTeams,
  updateMemberRole,
} from '@/services/teamService';
import { useUser } from '@/store/authStore';

const STATUS_BADGE_MAP: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INVITED: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  // 兼容小写（如果后端返回小写）
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  pending: 'bg-blue-100 text-blue-700',
  inactive: 'bg-gray-100 text-gray-500',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const REQUEST_STATUS_MAP: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
  // 兼容小写
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
};

const ROLE_LABEL_MAP: Record<string, string> = {
  ADMIN: '管理员',
  MEMBER: '成员',
  GUEST: '访客',
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN') : '未知';

export default function TeamManagement() {
  const { isAuthenticated, user } = useUser();

  // 处理可能的嵌套结构：如果 user.user 存在，则使用它；否则使用 user 本身
  const actualUser = (user as any)?.user || user;

  // 判断是否为系统管理员
  const isSystemAdmin = Boolean(actualUser?.is_system_admin);

  const [activeTab, setActiveTab] = useState<'list' | 'members'>('list');

  // 团队列表
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // 成员列表
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchMemberKeyword, setSearchMemberKeyword] = useState('');

  // 加入申请列表
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequestItem[]>([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  // 角色编辑状态
  const [isRoleEditMode, setIsRoleEditMode] = useState(false);
  const [editedRoles, setEditedRoles] = useState<Record<number, 'ADMIN' | 'MEMBER' | 'GUEST'>>({});
  const [savingRoles, setSavingRoles] = useState(false);

  // UI 状态
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [searchTeamModalOpen, setSearchTeamModalOpen] = useState(false);

  // 创建团队表单
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    hospital: '',
    department: '',
    maxMembers: '10',
  });

  // 搜索团队
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinTargetTeam, setJoinTargetTeam] = useState<TeamSummary | null>(null);
  const [submittingJoinRequest, setSubmittingJoinRequest] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);

  const selectedTeam = useMemo(
    () => myTeams.find(team => team.id === selectedTeamId) ?? null,
    [myTeams, selectedTeamId]
  );

  const filteredMembers = useMemo(() => {
    if (!searchMemberKeyword.trim()) return members;
    const keyword = searchMemberKeyword.trim().toLowerCase();
    return members.filter(member =>
      [member.username, member.real_name, member.email]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(keyword))
    );
  }, [members, searchMemberKeyword]);

  const currentMember = useMemo(
    () => {
      if (!user) return null;

      // user 的结构是 { user: { id, username, ... } }
      const actualUser = (user as any).user || user;
      const userId = actualUser.id;

      if (!userId) return null;

      // 确保类型一致再比较
      return members.find(member => Number(member.id) === Number(userId)) ?? null;
    },
    [members, user]
  );

  const isCurrentUserAdmin = currentMember?.role === 'ADMIN';

  // 加载团队列表
  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const response = await getMyTeams();
      const items = response?.items ?? [];
      setMyTeams(items);
      // 不自动选中任何团队，让用户主动点击选择
    } catch (err) {
      console.error(err);
      setError('获取团队列表失败');
    } finally {
      setLoadingTeams(false);
    }
  };

  // 加载成员列表
  const loadMembers = async (teamId: number) => {
    try {
      setLoadingMembers(true);
      const response: TeamMembersResponse | undefined = await getTeamMembers(teamId);
      setMembers(response?.members ?? []);
    } catch (err) {
      console.error('获取成员列表失败:', err);
      setError('获取成员列表失败');
    } finally {
      setLoadingMembers(false);
    }
  };

  // 加载加入申请
  const loadJoinRequests = async (teamId: number) => {
    try {
      setLoadingJoinRequests(true);
      const response = await getTeamJoinRequests(teamId);
      setJoinRequests(response.items);
    } catch (err) {
      console.error('获取申请列表失败:', err);
      setError('获取申请列表失败');
    } finally {
      setLoadingJoinRequests(false);
    }
  };

  // 处理加入申请
  const handleReviewJoinRequest = async (
    request: TeamJoinRequestItem,
    decision: 'approve' | 'reject'
  ) => {
    if (!selectedTeamId) return;

    try {
      setProcessingRequestId(request.id);
      const result = await reviewTeamJoinRequest(selectedTeamId, request.id, decision);
      setSuccessMessage(result.message || '申请已处理');
      await loadJoinRequests(selectedTeamId);
      if (decision === 'approve') {
        await loadMembers(selectedTeamId);
      }
    } catch (err) {
      console.error(err);
      setError('处理申请失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 创建团队
  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    try {
      setCreatingTeam(true);
      const maxMembersNumber = Number(createForm.maxMembers);
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        hospital: createForm.hospital.trim() || undefined,
        department: createForm.department.trim() || undefined,
        max_members: Number.isNaN(maxMembersNumber) ? undefined : maxMembersNumber,
      };

      const createdTeam = await createTeam(payload);
      setSuccessMessage('团队创建成功');
      setCreateModalOpen(false);
      setCreateForm({ name: '', description: '', hospital: '', department: '', maxMembers: '10' });
      await loadTeams();
      setSelectedTeamId(createdTeam.id);
    } catch (err) {
      console.error(err);
      setError('创建团队失败');
    } finally {
      setCreatingTeam(false);
    }
  };

  // 搜索团队
  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!searchKeyword.trim()) return;

    try {
      setSearching(true);
      const response = await searchTeams(searchKeyword.trim());
      setSearchResults(response.results);
    } catch (err) {
      console.error(err);
      setError('搜索团队失败');
    } finally {
      setSearching(false);
    }
  };

  // 申请加入团队
  const handleJoinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!joinTargetTeam) return;

    const targetTeamId = joinTargetTeam.id;

    try {
      setSubmittingJoinRequest(true);
      const response = await applyToJoinTeam(targetTeamId, joinMessage.trim());
      setSuccessMessage(response.message || '申请已提交');
      setJoinModalOpen(false);
      setJoinTargetTeam(null);
      setJoinMessage('');
      setSearchResults(prev =>
        prev.map(item =>
          item.id === targetTeamId
            ? { ...item, join_status: 'PENDING', join_request_id: response.request_id }
            : item
        )
      );
      // 刷新"我的团队"列表，显示新申请的团队
      await loadTeams();
    } catch (err) {
      console.error(err);
      setError('申请失败');
    } finally {
      setSubmittingJoinRequest(false);
    }
  };

  // 撤销申请
  const handleCancelRequest = async (teamId: number, requestId: number) => {
    if (!confirm('确定要撤销该申请吗？')) return;

    try {
      setCancellingRequestId(requestId);
      await cancelTeamJoinRequest(teamId, requestId);
      setSuccessMessage('申请已撤销');
      setSearchResults(prev =>
        prev.map(item =>
          item.id === teamId ? { ...item, join_status: null, join_request_id: null } : item
        )
      );
      // 刷新"我的团队"列表，移除已撤销的申请
      await loadTeams();
    } catch (err) {
      console.error(err);
      setError('撤销申请失败');
    } finally {
      setCancellingRequestId(null);
    }
  };

  // 进入角色编辑模式
  const handleEnterRoleEditMode = () => {
    // 初始化编辑状态，记录所有成员的当前角色
    const initialRoles: Record<number, 'ADMIN' | 'MEMBER' | 'GUEST'> = {};
    members.forEach(member => {
      initialRoles[member.id] = member.role;
    });
    setEditedRoles(initialRoles);
    setIsRoleEditMode(true);
  };

  // 取消角色编辑
  const handleCancelRoleEdit = () => {
    setIsRoleEditMode(false);
    setEditedRoles({});
  };

  // 修改某个成员的角色（在编辑模式中）
  const handleRoleChange = (userId: number, newRole: 'ADMIN' | 'MEMBER' | 'GUEST') => {
    setEditedRoles(prev => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  // 保存所有角色修改
  const handleSaveAllRoles = async () => {
    if (!selectedTeamId) return;

    // 找出所有发生变化的角色
    const changes: Array<{ userId: number; oldRole: string; newRole: string }> = [];
    members.forEach(member => {
      const newRole = editedRoles[member.id];
      if (newRole && newRole !== member.role) {
        changes.push({
          userId: member.id,
          oldRole: member.role,
          newRole: newRole,
        });
      }
    });

    if (changes.length === 0) {
      setSuccessMessage('没有需要保存的修改');
      setIsRoleEditMode(false);
      return;
    }

    try {
      setSavingRoles(true);

      // 逐个提交修改
      for (const change of changes) {
        await updateMemberRole(selectedTeamId, change.userId, change.newRole as 'ADMIN' | 'MEMBER');
      }

      setSuccessMessage(`已成功修改 ${changes.length} 个成员的角色`);
      setIsRoleEditMode(false);
      setEditedRoles({});

      // 刷新成员列表
      await loadMembers(selectedTeamId);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || '保存角色修改失败');
    } finally {
      setSavingRoles(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadTeams();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedTeamId || !isAuthenticated) return;
    loadMembers(selectedTeamId);
  }, [selectedTeamId, isAuthenticated]);

  useEffect(() => {
    if (!selectedTeamId || !isAuthenticated) {
      setJoinRequests([]);
      return;
    }
    // 只有当 members 加载完成且当前用户是管理员时才加载申请列表
    if (members.length > 0 && isCurrentUserAdmin) {
      loadJoinRequests(selectedTeamId);
    } else if (members.length > 0 && !isCurrentUserAdmin) {
      // 如果不是管理员，清空申请列表
      setJoinRequests([]);
    }
    // 当 members 为空时不做任何操作，等待加载完成
  }, [selectedTeamId, isAuthenticated, isCurrentUserAdmin, members.length]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        登录后即可管理团队
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* 左侧：团队列表 */}
      <div className="flex w-80 flex-col gap-4">
        {/* 操作按钮 */}
        <div className="flex gap-2">
          {isSystemAdmin ? (
            <>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                创建团队
              </button>

              <button
                onClick={() => setSearchTeamModalOpen(true)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                搜索团队
              </button>
            </>
          ) : (
            // 普通用户只显示搜索按钮并占满整行
            <button
              onClick={() => setSearchTeamModalOpen(true)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              搜索团队
            </button>
          )}
        </div>

        {/* 团队列表 */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900">我的团队</h3>
            <p className="text-xs text-gray-500">共 {myTeams.length} 个团队</p>
          </div>

          {loadingTeams ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">加载中...</div>
          ) : myTeams.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">暂无团队</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myTeams.map(team => {
                const isPending = team.join_status === 'PENDING' || team.join_status === 'pending';
                const isSelected = team.id === selectedTeamId;

                return (
                  <div
                    key={team.id}
                    className={`relative w-full px-4 py-3 text-left transition ${isPending
                        ? 'bg-gray-50 opacity-90'
                        : 'hover:bg-gray-50 cursor-pointer'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => !isPending && setSelectedTeamId(team.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{team.name}</h4>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                          {team.description || '暂无描述'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                          {team.hospital && <span>{team.hospital}</span>}
                          {team.department && <span>{team.department}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPending && team.join_request_id ? (
                          <>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              申请中
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRequest(team.id, team.join_request_id!);
                              }}
                              disabled={cancellingRequestId === team.join_request_id}
                              className="text-sm text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingRequestId === team.join_request_id ? '撤销中...' : '撤销'}
                            </button>
                          </>
                        ) : isSelected ? (
                          <i className="ri-check-line text-lg text-blue-600" />
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      成员 {team.member_count}
                      {team.max_members ? ` / ${team.max_members}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：团队详情 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selectedTeam ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
            <div className="text-center text-gray-500">
              <i className="ri-team-line mb-2 text-4xl" />
              <p>请选择一个团队查看详情</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            {/* 消息提示 */}
            {error && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                  <i className="ri-close-line" />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span>{successMessage}</span>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-500 hover:text-emerald-700"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            )}

            {/* 团队信息卡片 - 固定高度 */}
            <div className="flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTeam.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{selectedTeam.description || '暂无描述'}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                    {selectedTeam.hospital && (
                      <span className="flex items-center gap-1">
                        <i className="ri-building-line" />
                        {selectedTeam.hospital}
                      </span>
                    )}
                    {selectedTeam.department && (
                      <span className="flex items-center gap-1">
                        <i className="ri-stethoscope-line" />
                        {selectedTeam.department}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <i className="ri-user-star-line" />
                      创建者：{selectedTeam.creator_name || '未设置'}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedTeam.member_count}</div>
                  <div className="text-xs text-gray-500">
                    成员{selectedTeam.max_members ? ` / ${selectedTeam.max_members}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* 成员列表 - 占据剩余空间 */}
            <div className={`flex ${isCurrentUserAdmin ? 'flex-1' : 'flex-[2]'} flex-col overflow-hidden rounded-lg border border-gray-200 bg-white`}>
              <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">团队成员</h3>
                  <p className="text-xs text-gray-500">共 {members.length} 名成员</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchMemberKeyword}
                    onChange={e => setSearchMemberKeyword(e.target.value)}
                    placeholder="搜索成员"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {isCurrentUserAdmin && (
                    <>
                      {isRoleEditMode ? (
                        <>
                          <button
                            onClick={handleSaveAllRoles}
                            disabled={savingRoles}
                            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingRoles ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={handleCancelRoleEdit}
                            disabled={savingRoles}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEnterRoleEditMode}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <i className="ri-shield-user-line" />
                          <span>身份管理</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
                {loadingMembers ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">加载中...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">暂无成员</div>
                ) : (
                  filteredMembers.map(member => {
                    const canEditThisMember = true; // 管理员可以修改所有成员的角色

                    return (
                      <div key={member.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <i className="ri-user-line text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {member.real_name || member.username}
                              </span>
                              {member.is_creator && (
                                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                                  创建者
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRoleEditMode && canEditThisMember ? (
                            <select
                              value={editedRoles[member.id] || member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as 'ADMIN' | 'MEMBER' | 'GUEST')}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                              disabled={savingRoles}
                            >
                              <option value="ADMIN">管理员</option>
                              <option value="MEMBER">成员</option>
                              <option value="GUEST">访客</option>
                            </select>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_MAP[member.status] || 'bg-gray-100 text-gray-500'
                                }`}
                            >
                              {ROLE_LABEL_MAP[editedRoles[member.id] || member.role] || member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 加入申请列表 - 占据剩余空间 */}
            {isCurrentUserAdmin && (
              <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">加入申请</h3>
                    <p className="text-xs text-gray-500">
                      待处理 {joinRequests.filter(r => r.status === 'PENDING').length} 条
                    </p>
                  </div>
                  <button
                    onClick={() => selectedTeamId && loadJoinRequests(selectedTeamId)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    <i className="ri-refresh-line mr-1" />
                    刷新
                  </button>
                </div>

                <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
                  {loadingJoinRequests ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">加载中...</div>
                  ) : joinRequests.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">暂无申请记录</div>
                  ) : (
                    joinRequests.map(request => {
                      const isPending = request.status === 'PENDING';
                      const isProcessing = processingRequestId === request.id;

                      return (
                        <div
                          key={request.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {request.applicant_real_name || request.applicant_username}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({request.applicant_email || '未填写邮箱'})
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              {request.message || <span className="italic">未填写申请理由</span>}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              申请时间：{formatDateTime(request.requested_at)}
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleReviewJoinRequest(request, 'approve')}
                                  disabled={isProcessing}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isProcessing ? '处理中...' : '通过'}
                                </button>
                                <button
                                  onClick={() => handleReviewJoinRequest(request, 'reject')}
                                  disabled={isProcessing}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isProcessing ? '处理中...' : '驳回'}
                                </button>
                              </>
                            ) : (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_MAP[request.status] || 'bg-gray-100 text-gray-500'
                                  }`}
                              >
                                {REQUEST_STATUS_MAP[request.status] || request.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 创建团队模态框 */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">创建新团队</h3>
              <button
                onClick={() => !creatingTeam && setCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">团队名称</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="请输入团队名称"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">团队描述</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="简单介绍团队职责与目标"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">所属医院</label>
                  <input
                    type="text"
                    value={createForm.hospital}
                    onChange={e => setCreateForm(prev => ({ ...prev, hospital: e.target.value }))}
                    placeholder="例如：协和医院"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">所属科室</label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={e =>
                      setCreateForm(prev => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="例如：放射科"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">最大成员数</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={createForm.maxMembers}
                  onChange={e => setCreateForm(prev => ({ ...prev, maxMembers: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => !creatingTeam && setCreateModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={creatingTeam}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={creatingTeam}
                >
                  {creatingTeam ? '创建中...' : '创建团队'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 搜索团队模态框 */}
      {searchTeamModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSearchTeamModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">搜索团队</h3>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleSearch} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="输入团队名称、医院或科室"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={searching}
                >
                  {searching ? '搜索中...' : '搜索'}
                </button>
              </form>

              <div className="max-h-96 space-y-3 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {searchKeyword ? '未找到相关团队' : '请输入关键词搜索团队'}
                  </div>
                ) : (
                  searchResults.map(team => {
                    const isPending = team.join_status === 'PENDING' || team.join_status === 'pending';
                    const isCancelling = cancellingRequestId === team.join_request_id;

                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-600">{team.description || '暂无描述'}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            {team.hospital && <span>{team.hospital}</span>}
                            {team.department && <span>{team.department}</span>}
                            <span>成员 {team.member_count}</span>
                          </div>
                        </div>

                        {team.is_member ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            已加入
                          </span>
                        ) : isPending && team.join_request_id ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                              待审批
                            </span>
                            <button
                              onClick={() => handleCancelRequest(team.id, team.join_request_id!)}
                              disabled={isCancelling}
                              className="text-sm text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCancelling ? '撤销中...' : '撤销'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setJoinTargetTeam(team);
                              setJoinModalOpen(true);
                            }}
                            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                          >
                            申请加入
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 底部关闭按钮 */}
              <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setSearchTeamModalOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 申请加入模态框 */}
      {joinModalOpen && joinTargetTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">申请加入团队</h3>
              <button
                onClick={() => !submittingJoinRequest && setJoinModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="font-medium text-blue-900">{joinTargetTeam.name}</div>
                <div className="text-sm text-blue-700">{joinTargetTeam.description}</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  申请理由（可选）
                </label>
                <textarea
                  value={joinMessage}
                  onChange={e => setJoinMessage(e.target.value)}
                  rows={4}
                  placeholder="可选填写您希望加入团队的缘由"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => !submittingJoinRequest && setJoinModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={submittingJoinRequest}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={submittingJoinRequest}
                >
                  {submittingJoinRequest ? '提交中...' : '提交申请'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
