'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import {
  TeamSummary,
  applyToJoinTeam,
  createTeam,
  getMyTeams,
  searchTeams,
} from '@/services/teamService';
import { useUser } from '@/store/authStore';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('zh-CN') : '未知';

export default function TeamManagement() {
  const { isAuthenticated } = useUser();

  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSummary[]>([]);

  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    hospital: '',
    department: '',
    maxMembers: '10',
  });

  const activeTeam = useMemo(
    () => (myTeams ?? []).find(team => team.id === activeTeamId) ?? null,
    [activeTeamId, myTeams]
  );

  const refreshMyTeams = async (preferredTeamId?: number) => {
    try {
      setLoadingMyTeams(true);
      const response = await getMyTeams();
      const items = response?.items ?? [];
      setMyTeams(items);
      let nextActiveId: number | null | undefined = activeTeamId;

      if (preferredTeamId && items.some(team => team.id === preferredTeamId)) {
        nextActiveId = preferredTeamId;
      } else if (!nextActiveId && items.length > 0) {
        nextActiveId = items[0].id;
      } else if (nextActiveId && !items.some(team => team.id === nextActiveId)) {
        nextActiveId = items[0]?.id ?? null;
      }

      setActiveTeamId(nextActiveId ?? null);
    } catch (err) {
      console.error(err);
      setError('获取团队信息失败，请稍后重试');
    } finally {
      setLoadingMyTeams(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setMyTeams([]);
      setActiveTeamId(null);
      setSearchResults([]);
      return;
    }
    refreshMyTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const response = await searchTeams(searchKeyword.trim());
      setSearchResults(response.results);
    } catch (err) {
      console.error(err);
      setError('搜索团队失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  const handleApply = async (team: TeamSummary) => {
    try {
      setError(null);
      const message = await applyToJoinTeam(team.id);
      setSuccessMessage(message || '申请已提交，等待审核');
      // 更新搜索结果中的状态
      setSearchResults(prev =>
        prev.map(item =>
          item.id === team.id
            ? { ...item, join_status: 'pending', is_member: false }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      setError('申请加入团队失败，请稍后重试');
    }
  };

  const handleCreateFormChange = (
    field: keyof typeof createForm,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    try {
      setCreatingTeam(true);
      setError(null);

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
      setCreateForm({
        name: '',
        description: '',
        hospital: '',
        department: '',
        maxMembers: '10',
      });
      await refreshMyTeams(createdTeam.id);
    } catch (err) {
      console.error(err);
      setError('创建团队失败，请稍后重试');
    } finally {
      setCreatingTeam(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        登录后即可管理团队、搜索并申请加入新的协作团队。
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

      {/* 搜索团队 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">搜索团队</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={event => setSearchKeyword(event.target.value)}
              placeholder="输入团队名称、医院或科室"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={searching}
          >
            {searching ? '搜索中...' : '搜索团队'}
          </button>
        </form>
      </div>

      {/* 团队详情 */}
      <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        {loadingMyTeams ? (
          <div className="animate-pulse text-gray-500">正在加载团队数据...</div>
        ) : activeTeam ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-1 items-start space-x-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100">
                <i className="ri-team-line text-2xl text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeTeam.name}</h2>
                <p className="mt-1 text-gray-700">{activeTeam.description || '暂无描述'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {activeTeam.hospital && (
                    <span className="flex items-center gap-1">
                      <i className="ri-building-line" />
                      {activeTeam.hospital}
                    </span>
                  )}
                  {activeTeam.department && (
                    <span className="flex items-center gap-1">
                      <i className="ri-stethoscope-line" />
                      {activeTeam.department}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <i className="ri-user-star-line" />
                    负责人：{activeTeam.leader_name || '未设置'}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-calendar-line" />
                    创建时间：{formatDate(activeTeam.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-center">
              <div className="text-sm text-gray-500">成员数量</div>
              <div className="text-2xl font-semibold text-blue-600">
                {activeTeam.member_count}
                {activeTeam.max_members ? ` / ${activeTeam.max_members}` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">暂未加入任何团队，赶快在下方搜索并申请加入吧。</div>
        )}
      </div>

      {/* 我的团队 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">我的团队</h3>
            <p className="text-sm text-gray-600">点击切换团队查看详细信息</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              创建团队
            </button>
            <button
              onClick={() => refreshMyTeams()}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              刷新
            </button>
          </div>
        </div>

        {myTeams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            暂无已加入的团队。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myTeams.map(team => (
              <button
                key={team.id}
                onClick={() => setActiveTeamId(team.id)}
                className={`flex h-full flex-col rounded-lg border p-4 text-left transition hover:border-blue-400 hover:shadow-sm ${
                  team.id === activeTeamId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900">{team.name}</h4>
                  {team.id === activeTeamId && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                      当前查看
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {team.description || '暂无团队简介'}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  {team.hospital && <span>{team.hospital}</span>}
                  {team.department && <span>{team.department}</span>}
                  <span>成员：{team.member_count}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 搜索结果 */}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">创建新团队</h3>
              <button
                onClick={() => !creatingTeam && setCreateModalOpen(false)}
                className="text-gray-400 transition hover:text-gray-600"
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
                  onChange={event => handleCreateFormChange('name', event)}
                  required
                  placeholder="请输入团队名称"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">团队描述</label>
                <textarea
                  value={createForm.description}
                  onChange={event => handleCreateFormChange('description', event)}
                  rows={3}
                  placeholder="简单介绍团队职责与目标"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">所属医院</label>
                  <input
                    type="text"
                    value={createForm.hospital}
                    onChange={event => handleCreateFormChange('hospital', event)}
                    placeholder="例如：协和医院"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">所属科室</label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={event => handleCreateFormChange('department', event)}
                    placeholder="例如：放射科"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                  onChange={event => handleCreateFormChange('maxMembers', event)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">搜索结果</h3>
            <p className="text-sm text-gray-600">
              共找到 <span className="font-semibold text-blue-600">{searchResults.length}</span> 个相关团队
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {searchResults.map(team => {
              const isPending = team.join_status === 'pending';
              return (
                <div key={team.id} className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{team.name}</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {team.description || '暂无团队简介'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-500">
                      {team.hospital && <div>医院：{team.hospital}</div>}
                      {team.department && <div>科室：{team.department}</div>}
                      <div>
                        成员：{team.member_count}
                        {team.max_members ? ` / ${team.max_members}` : ''}
                      </div>
                      {team.leader_name && <div>负责人：{team.leader_name}</div>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      创建时间：{formatDate(team.created_at)}
                    </span>
                    {team.is_member ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        已加入
                      </span>
                    ) : isPending ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        待审批
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(team)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                      >
                        申请加入
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
