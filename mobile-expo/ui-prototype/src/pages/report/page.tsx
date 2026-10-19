import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reportData, ReviewStatus, ReportTemplate } from '@/mocks/reports';
import TemplateSheet from './components/TemplateSheet';
import RejectSheet from './components/RejectSheet';

const statusMap: Record<ReviewStatus, { bg: string; text: string; label: string; icon: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: '草稿', icon: 'ri-draft-line' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-600', label: '待审核', icon: 'ri-time-line' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '已通过', icon: 'ri-checkbox-circle-line' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-500', label: '已驳回', icon: 'ri-close-circle-line' },
};

function now() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const sectionConfig = [
  { key: 'findings', title: '影像所见', icon: 'ri-image-line', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'impression', title: '诊断印象', icon: 'ri-stethoscope-line', color: 'text-violet-500', bg: 'bg-violet-50' },
  { key: 'conclusion', title: '诊断结论', icon: 'ri-file-text-line', color: 'text-sky-500', bg: 'bg-sky-50' },
  { key: 'recommendation', title: '建议', icon: 'ri-lightbulb-line', color: 'text-amber-500', bg: 'bg-amber-50' },
] as const;

type SectionKey = (typeof sectionConfig)[number]['key'];

export default function Report() {
  const navigate = useNavigate();
  const { id } = useParams();
  const reportId = id || reportData.id;

  const [status, setStatus] = useState<ReviewStatus>(reportData.status);
  const [reviewer, setReviewer] = useState(reportData.reviewer);
  const [reviewTime, setReviewTime] = useState(reportData.reviewTime);
  const [rejectReason, setRejectReason] = useState(reportData.rejectReason);
  const [history, setHistory] = useState(reportData.history);

  const [sections, setSections] = useState<Record<SectionKey, string>>({
    findings: reportData.findings,
    impression: reportData.impression,
    conclusion: reportData.conclusion,
    recommendation: reportData.recommendation,
  });

  const [editing, setEditing] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const addHistory = (operator: string, role: string, action: string, comment: string) => {
    setHistory((prev) => [
      ...prev,
      { id: `H${prev.length + 1}`, operator, role, action, comment, time: now() },
    ]);
  };

  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setSections({
      findings: reportData.findings,
      impression: reportData.impression,
      conclusion: reportData.conclusion,
      recommendation: reportData.recommendation,
    });
    setEditing(false);
  };
  const saveEdit = () => {
    setEditing(false);
    showToast('报告内容已保存');
  };

  const applyTemplate = (template: ReportTemplate) => {
    setSections({
      findings: sections.findings,
      impression: template.impression,
      conclusion: template.conclusion,
      recommendation: template.recommendation,
    });
    showToast(`已应用「${template.name}」`);
  };

  const submitReview = () => {
    setStatus('pending');
    addHistory('王医生', '主治医师', '提交审核', '报告已生成，提交上级医师审核');
    showToast('已提交审核');
  };

  const approve = () => {
    setStatus('approved');
    setReviewer('李主任');
    setReviewTime(now());
    addHistory('李主任', '主任医师', '审核通过', '报告内容准确，审核通过');
    showToast('报告已通过审核');
  };

  const reject = (reason: string) => {
    setStatus('rejected');
    setRejectReason(reason);
    addHistory('李主任', '主任医师', '审核驳回', reason);
    showToast('报告已驳回');
  };

  const resubmit = () => {
    setStatus('pending');
    setRejectReason('');
    addHistory('王医生', '主治医师', '重新提交', '已根据驳回意见修改，重新提交审核');
    showToast('已重新提交审核');
  };

  const currentStatus = statusMap[status];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
            >
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">诊断报告</h1>
              <p className="text-violet-100 text-xs mt-0.5">报告编号 {reportId}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${currentStatus.bg} ${currentStatus.text}`}>
            <i className={`${currentStatus.icon} text-sm`}></i>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* 可滚动内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
        {/* 患者基本信息 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-user-line text-violet-600 text-sm"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-800">患者信息</h2>
          </div>
          <div className="grid grid-cols-3 gap-y-3 gap-x-2">
            {[
              { label: '姓名', value: reportData.patientName },
              { label: '性别', value: reportData.gender },
              { label: '年龄', value: `${reportData.age} 岁` },
              { label: '患者ID', value: reportData.patientId },
              { label: '检查类型', value: reportData.checkType },
              { label: '报告日期', value: reportData.reportDate },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-slate-400 mb-0.5">{item.label}</p>
                <p className="text-xs text-slate-700 font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI 测量结果入口 */}
        <button
          onClick={() => navigate(`/ai-measurement/${reportData.imageId}`)}
          className="w-full bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center gap-3 mb-4 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-400/30 flex-shrink-0">
            <i className="ri-magic-line text-white text-lg"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">AI 测量结果</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cobb 角 12.9° · SVA 2.5cm · PI 48°</p>
          </div>
          <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full">
            <i className="ri-arrow-right-line text-slate-400"></i>
          </div>
        </button>

        {/* 报告内容四个区块 */}
        <div className="space-y-3">
          {sectionConfig.map((section) => (
            <div key={section.key} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${section.bg}`}>
                  <i className={`${section.icon} ${section.color} text-sm`}></i>
                </div>
                <h2 className="text-sm font-bold text-slate-800">{section.title}</h2>
              </div>
              {editing ? (
                <textarea
                  value={sections[section.key]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [section.key]: e.target.value }))}
                  rows={section.key === 'findings' ? 5 : 4}
                  maxLength={500}
                  className="w-full resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 leading-relaxed outline-none focus:border-violet-400"
                />
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {sections[section.key] || <span className="text-slate-300">（暂无内容）</span>}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* 驳回原因提示 */}
        {status === 'rejected' && rejectReason && (
          <div className="mt-3 bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <i className="ri-error-warning-line text-rose-500"></i>
              <span className="text-sm font-semibold text-rose-600">驳回原因</span>
            </div>
            <p className="text-sm text-rose-500 leading-relaxed">{rejectReason}</p>
          </div>
        )}

        {/* 审核流转时间线 */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-route-line text-violet-600 text-sm"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-800">审核流转</h2>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="space-y-4">
              {history.map((record, index) => (
                <div key={record.id} className="flex gap-3">
                  {/* 左侧时间轴 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      record.role === 'AI 辅助'
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-br from-violet-400 to-purple-500'
                    }`}>
                      <i className={`${record.role === 'AI 辅助' ? 'ri-robot-line' : 'ri-user-line'} text-white text-sm`}></i>
                    </div>
                    {index < history.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1"></div>}
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{record.operator}</span>
                      <span className="text-[10px] text-slate-400">{record.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{record.role} · {record.action}</p>
                    <p className="text-xs text-slate-500 mt-1">{record.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 审核人信息（已通过时） */}
            {status === 'approved' && reviewer && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <i className="ri-shield-check-line text-emerald-500"></i>
                <span className="text-xs text-slate-500">
                  审核人：{reviewer} · {reviewTime}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 导出 / 分享 */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => showToast('PDF 已加入导出队列')}
            className="flex-1 py-3 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-download-2-line text-base"></i>
            导出 PDF
          </button>
          <button
            onClick={() => showToast('分享链接已生成')}
            className="flex-1 py-3 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-share-forward-line text-base"></i>
            分享
          </button>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-4 py-3 flex gap-2 flex-shrink-0">
        {editing ? (
          <>
            <button
              onClick={cancelEdit}
              className="flex-1 py-3 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              取消
            </button>
            <button
              onClick={saveEdit}
              className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <i className="ri-save-line text-base"></i>
              保存
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowTemplate(true)}
              className="w-14 py-3 bg-white text-slate-600 text-xs font-medium rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
            >
              <i className="ri-file-list-3-line text-base"></i>
              模板
            </button>
            <button
              onClick={startEdit}
              className="w-14 py-3 bg-white text-slate-600 text-xs font-medium rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1"
            >
              <i className="ri-edit-line text-base"></i>
              编辑
            </button>

            {status === 'draft' && (
              <button
                onClick={submitReview}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-send-plane-line text-base"></i>
                提交审核
              </button>
            )}

            {status === 'pending' && (
              <>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 py-3 bg-white text-rose-500 text-sm font-semibold rounded-2xl border border-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <i className="ri-close-circle-line text-base"></i>
                  驳回
                </button>
                <button
                  onClick={approve}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-emerald-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <i className="ri-check-line text-base"></i>
                  审核通过
                </button>
              </>
            )}

            {status === 'approved' && (
              <button
                onClick={() => showToast('报告已分享给患者')}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-emerald-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-share-forward-line text-base"></i>
                分享报告
              </button>
            )}

            {status === 'rejected' && (
              <button
                onClick={resubmit}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-refresh-line text-base"></i>
                重新提交
              </button>
            )}
          </>
        )}
      </div>

      {/* 模板弹层 */}
      {showTemplate && <TemplateSheet onClose={() => setShowTemplate(false)} onApply={applyTemplate} />}

      {/* 驳回弹层 */}
      {showReject && <RejectSheet onClose={() => setShowReject(false)} onConfirm={reject} />}

      {/* toast 提示 */}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800/95 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
          <i className="ri-checkbox-circle-fill text-emerald-400"></i>
          {toast}
        </div>
      )}
    </div>
  );
}