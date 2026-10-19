import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messagesData } from '../../mocks/messages';
import EmptyState from '@/components/base/EmptyState';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import Toast from '@/components/base/Toast';
import PageHeader from '@/components/feature/PageHeader';

export default function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(messagesData);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const unreadCount = messages.filter(msg => !msg.read).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleOpen = (id: string) => {
    setMessages(prev => prev.map(msg => (msg.id === id ? { ...msg, read: true } : msg)));
    navigate(`/messages/detail/${id}`);
  };

  const handleDelete = () => {
    if (!pendingDeleteId) return;
    setMessages(prev => prev.filter(msg => msg.id !== pendingDeleteId));
    setPendingDeleteId(null);
    showToast('消息已删除');
  };

  const handleReadAll = () => {
    if (unreadCount === 0) {
      showToast('没有未读消息');
      return;
    }
    setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
    showToast('已全部标记为已读');
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case '系统通知': return { icon: 'ri-notification-3-line', color: 'from-violet-400 to-violet-500' };
      case '审核提醒': return { icon: 'ri-file-search-line', color: 'from-amber-400 to-orange-500' };
      case '报告完成': return { icon: 'ri-file-text-line', color: 'from-emerald-400 to-teal-500' };
      default: return { icon: 'ri-message-3-line', color: 'from-slate-400 to-slate-500' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <PageHeader
        title="消息中心"
        subtitle={unreadCount > 0 ? `${messages.length} 条消息 · ${unreadCount} 条未读` : `${messages.length} 条消息 · 全部已读`}
        onBack={() => navigate(-1)}
        right={
          <button
            onClick={handleReadAll}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-full text-xs font-medium backdrop-blur-sm active:scale-95 transition-all ${
              unreadCount > 0 ? 'bg-white/25 text-white' : 'bg-white/10 text-white/50'
            }`}
          >
            <i className="ri-check-double-line text-sm"></i>
            全部已读
          </button>
        }
      />

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState
            icon="ri-inbox-line"
            title="暂无消息"
            description="新的通知会第一时间出现在这里"
          />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const typeStyle = getTypeIcon(message.type);
              return (
                <div
                  key={message.id}
                  onClick={() => handleOpen(message.id)}
                  className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 bg-gradient-to-br ${typeStyle.color} shadow-md`}>
                      <i className={`${typeStyle.icon} text-white text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{message.type}</span>
                        <span className="text-xs text-slate-400">{message.time}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm truncate ${message.read ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>{message.title}</h3>
                        {!message.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-2"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{message.content}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setPendingDeleteId(message.id)}
                      className="px-4 py-1.5 text-xs text-red-500 hover:bg-red-50 active:scale-95 rounded-lg transition-all flex items-center gap-1"
                    >
                      <i className="ri-delete-bin-line"></i>
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="删除这条消息？"
        description="删除后将无法恢复，关联的业务信息不受影响。"
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}