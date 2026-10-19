import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationData, membersData, pendingInvitesData } from '../../../mocks/organization';
import ConfirmDialog from '@/components/base/ConfirmDialog';

type TabType = 'members' | 'invites';

export default function Organization() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [searchText, setSearchText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMemberAction, setShowMemberAction] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', position: '' });
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [members, setMembers] = useState(membersData);
  const [pendingInvites, setPendingInvites] = useState(pendingInvitesData);
  const [toast, setToast] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const filteredMembers = members.filter(m =>
    m.name.includes(searchText) || m.position.includes(searchText) || m.email.includes(searchText)
  );

  const handleInviteSubmit = () => {
    if (!inviteForm.name || !inviteForm.email) return;
    setPendingInvites(prev => [
      ...prev,
      {
        id: `inv-${Date.now()}`,
        email: inviteForm.email,
        name: inviteForm.name,
        position: inviteForm.position,
        sentAt: new Date().toISOString().slice(0, 10),
        status: 'pending',
      },
    ]);
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', position: '' });
    }, 1800);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setShowMemberAction(null);
    setPendingRemoveId(null);
    showToast('已移除该成员');
  };

  const handleCancelInvite = (id: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    showToast('已撤销邀请');
  };

  const handleToggleAdmin = (id: string) => {
    const target = members.find(m => m.id === id);
    if (!target) return;
    const nextRole = target.role === '管理员' ? '成员' : '管理员';
    setMembers(prev => prev.map(m => (m.id === id ? { ...m, role: nextRole } : m)));
    setShowMemberAction(null);
    showToast(`已${nextRole === '管理员' ? '设为管理员' : '取消管理员权限'}`);
  };

  const avatarColors = [
    'from-violet-400 to-violet-500',
    'from-purple-400 to-purple-500',
    'from-indigo-400 to-indigo-500',
    'from-emerald-400 to-emerald-500',
    'from-amber-400 to-amber-500',
    'from-pink-400 to-pink-500',
    'from-sky-400 to-sky-500',
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Toast */}
      {toast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 text-white text-sm px-5 py-2.5 rounded-full shadow-xl backdrop-blur-sm">
          {toast}
        </div>
      )}

      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <h1 className="text-white text-xl font-bold">组织管理</h1>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium"
          >
            <i className="ri-user-add-line text-base"></i>
            邀请成员
          </button>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 组织信息卡片 */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
              <i className="ri-building-4-line text-white text-2xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-slate-800 truncate">{organizationData.name}</h2>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-semibold rounded-full">
                  {organizationData.role}
                </span>
                <span className="text-xs text-slate-400">#{organizationData.code}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{organizationData.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">{members.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">成员总数</div>
            </div>
            <div className="text-center border-x border-slate-100">
              <div className="text-lg font-bold text-slate-800">{pendingInvites.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">待接受邀请</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-800">{organizationData.createdAt.slice(0, 4)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">创建年份</div>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-100 mb-4 flex">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-500'
            }`}
          >
            <i className="ri-team-line text-base"></i>
            成员列表
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'members' ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'}`}>{members.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invites'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-500'
            }`}
          >
            <i className="ri-mail-send-line text-base"></i>
            待接受邀请
            {pendingInvites.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'invites' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-600'}`}>{pendingInvites.length}</span>
            )}
          </button>
        </div>

        {/* 成员列表 */}
        {activeTab === 'members' && (
          <>
            <div className="relative mb-4">
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="搜索姓名、职位或邮箱"
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 shadow-sm placeholder:text-slate-400"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                <i className="ri-search-line text-slate-500 text-sm"></i>
              </div>
            </div>
            <div className="space-y-3">
              {filteredMembers.map((member, index) => (
                <div key={member.id} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${avatarColors[index % avatarColors.length]} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <span className="text-white text-sm font-bold">{member.name.slice(0, 1)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-slate-800">{member.name}</span>
                        {member.isSelf && (
                          <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-semibold rounded-full">我</span>
                        )}
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                          member.role === '管理员'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>{member.role}</span>
                        {member.status === 'pending' && (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[10px] font-semibold rounded-full">待激活</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{member.position} · {member.department}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{member.email}</div>
                    </div>
                    {!member.isSelf && (
                      <button
                        onClick={() => setShowMemberAction(member.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 flex-shrink-0"
                      >
                        <i className="ri-more-2-fill text-base"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <i className="ri-user-search-line text-2xl text-slate-300"></i>
                  </div>
                  <p className="text-sm">未找到相关成员</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 待接受邀请列表 */}
        {activeTab === 'invites' && (
          <div className="space-y-3">
            {pendingInvites.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <i className="ri-mail-check-line text-2xl text-slate-300"></i>
                </div>
                <p className="text-sm">暂无待接受的邀请</p>
              </div>
            )}
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-sm font-bold">{invite.name.slice(0, 1)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-800">{invite.name}</span>
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-semibold rounded-full">待接受</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{invite.email}</div>
                    {invite.position && (
                      <div className="text-xs text-slate-400 mt-0.5">{invite.position}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-slate-400 mb-2">{invite.sentAt}</div>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-medium rounded-lg"
                    >
                      撤销
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingInvites.length > 0 && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full py-3.5 border-2 border-dashed border-violet-200 rounded-2xl text-violet-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors"
              >
                <i className="ri-user-add-line"></i>
                继续邀请成员
              </button>
            )}
          </div>
        )}
      </div>

      {/* 成员操作弹窗 */}
      {showMemberAction && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowMemberAction(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"></div>
            {(() => {
              const m = members.find(x => x.id === showMemberAction);
              return m ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold">{m.name.slice(0, 1)}</span>
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.position}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleToggleAdmin(m.id)}
                      className="w-full py-3.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-3 px-4 active:bg-slate-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <i className={`${m.role === '管理员' ? 'ri-shield-cross-line' : 'ri-shield-user-line'} text-violet-600 text-base`}></i>
                      </div>
                      {m.role === '管理员' ? '取消管理员权限' : '设为管理员'}
                    </button>
                    <button
                      onClick={() => { setPendingRemoveId(m.id); setShowMemberAction(null); }}
                      className="w-full py-3.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium flex items-center gap-3 px-4 active:bg-red-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <i className="ri-user-unfollow-line text-red-500 text-base"></i>
                      </div>
                      移除成员
                    </button>
                  </div>
                </>
              ) : null;
            })()}
            <button onClick={() => setShowMemberAction(null)} className="w-full mt-4 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium">取消</button>
          </div>
        </div>
      )}

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end" onClick={() => { setShowInviteModal(false); setInviteSuccess(false); setInviteForm({ name: '', email: '', position: '' }); }}>
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"></div>
            {inviteSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <i className="ri-check-line text-white text-3xl"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">邀请已发送</h3>
                <p className="text-sm text-slate-500">邀请邮件已发送至 {inviteForm.email}</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-800 mb-1">邀请成员</h3>
                <p className="text-xs text-slate-500 mb-5">填写信息后发送邀请，对方接受后将加入组织</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">姓名 <span className="text-red-400">*</span></label>
                    <input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入姓名" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder:text-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">邮箱 <span className="text-red-400">*</span></label>
                    <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="请输入邮箱地址" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder:text-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">职位</label>
                    <input type="text" value={inviteForm.position} onChange={e => setInviteForm(f => ({ ...f, position: e.target.value }))} placeholder="如：主治医师、技师等（选填）" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder:text-slate-400" />
                  </div>
                </div>
                <button onClick={handleInviteSubmit} disabled={!inviteForm.name || !inviteForm.email} className={`w-full mt-5 py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${inviteForm.name && inviteForm.email ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 text-slate-400'}`}>
                  <i className="ri-send-plane-line"></i>
                  发送邀请
                </button>
                <button onClick={() => { setShowInviteModal(false); setInviteForm({ name: '', email: '', position: '' }); }} className="w-full mt-2 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium">取消</button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="移出该成员？"
        description="移除后该成员将无法查看本组织的患者与影像数据。"
        confirmText="移除"
        danger
        onConfirm={() => pendingRemoveId && handleRemoveMember(pendingRemoveId)}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
