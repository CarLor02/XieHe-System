import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { messagesData, MessageItem } from '@/mocks/messages';
import ConfirmDialog from '@/components/base/ConfirmDialog';

const typeIconMap: Record<string, { icon: string; color: string; bg: string; text: string }> = {
  '系统通知': { icon: 'ri-notification-3-line', color: 'from-violet-400 to-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
  '审核提醒': { icon: 'ri-file-search-line', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  '报告完成': { icon: 'ri-file-text-line', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

export default function MessageDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const messageId = id || 'MSG001';

  const message: MessageItem | undefined = useMemo(
    () => messagesData.find((m) => m.id === messageId) || messagesData[0],
    [messageId],
  );

  const [read, setRead] = useState(message.read);
  const [toast, setToast] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const typeStyle = typeIconMap[message.type] || typeIconMap['系统通知'];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleBizAction = () => {
    const biz = message.biz;
    if (biz.type === 'annotation') {
      navigate(`/image-annotation?id=${biz.targetId}`);
    } else if (biz.type === 'report') {
      navigate(`/report/${biz.targetId}`);
    } else if (biz.type === 'image') {
      navigate(`/images/detail/${biz.targetId}`);
    }
  };

  const handleDelete = () => {
    showToast('消息已删除');
    setTimeout(() => navigate(-1), 600);
  };

  const handleToggleRead = () => {
    setRead((v) => !v);
    showToast(read ? '已标记为未读' : '已标记为已读');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">消息详情</h1>
            <p className="text-violet-100 text-xs mt-0.5">{message.id}</p>
          </div>
        </div>
      </div>

      {/* 可滚动内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
        {/* 消息头信息卡 */}
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-3 flex-shrink-0 bg-gradient-to-br ${typeStyle.color} shadow-md`}>
              <i className={`${typeStyle.icon} text-white text-xl`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                  {message.type}
                </span>
                {!read && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-50 text-red-500">未读</span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-800 leading-snug">{message.title}</h2>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <i className="ri-user-3-line"></i>
              发送方：{message.sender}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="ri-time-line"></i>
              {message.time}
            </span>
          </div>
        </div>

        {/* 通知正文 */}
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-message-3-line text-violet-600 text-sm"></i>
            </div>
            <h3 className="text-sm font-bold text-slate-800">通知内容</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{message.detail}</p>
        </div>

        {/* 关联业务信息 */}
        {message.biz.type !== 'none' && message.biz.label && (
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-lg">
                <i className="ri-links-line text-slate-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-bold text-slate-800">关联业务</h3>
            </div>
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-slate-600">{message.biz.label}</span>
              <span className="text-xs text-slate-400 font-mono">{message.biz.targetId}</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-4 py-3 flex gap-2 flex-shrink-0">
        <button
          onClick={handleToggleRead}
          className="w-14 py-3 bg-white text-slate-600 text-xs font-medium rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
        >
          <i className={`${read ? 'ri-mail-open-line' : 'ri-mail-unread-line'} text-base`}></i>
          {read ? '已读' : '标记已读'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-14 py-3 bg-white text-slate-600 text-xs font-medium rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
        >
          <i className="ri-delete-bin-line text-base"></i>
          删除
        </button>

        {message.biz.type !== 'none' ? (
          <button
            onClick={handleBizAction}
            className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {message.biz.buttonText}
            <i className="ri-arrow-right-line text-base"></i>
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-check-line text-base"></i>
            知道了
          </button>
        )}
      </div>

      {/* toast 提示 */}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800/95 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
          <i className="ri-checkbox-circle-fill text-emerald-400"></i>
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除这条消息？"
        description="删除后该消息将从消息列表移除，关联的影像与报告数据不受影响。"
        confirmText="确认删除"
        danger
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}