import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { aiMeasurementResult, AiMetric } from '../../mocks/ai-measurements';

const statusMap: Record<AiMetric['status'], { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '正常' },
  high: { bg: 'bg-amber-50', text: 'text-amber-600', label: '偏高' },
  low: { bg: 'bg-sky-50', text: 'text-sky-600', label: '偏低' },
  attention: { bg: 'bg-rose-50', text: 'text-rose-500', label: '需关注' },
};

// 侧位 X 光大图（AI 测量结果叠加用）
const fullImage = 'https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20lateral%20side%20view%20full%20sagittal%20profile%20showing%20cervical%20thoracic%20lumbar%20vertebral%20column%20with%20natural%20spinal%20curves%20clear%20vertebrae%20on%20dark%20black%20background%20professional%20radiology%20diagnostic%20image%20high%20contrast%20sharp%20detail%20no%20annotation&width=600&height=800&seq=ai_result_lateral_01&orientation=portrait';

export default function AiMeasurement() {
  const navigate = useNavigate();
  const { id } = useParams();
  const imageId = id || 'IMG001';

  const primaryMetrics = useMemo(() => aiMeasurementResult.metrics.filter((m) => m.isPrimary), []);
  const detailMetrics = useMemo(() => aiMeasurementResult.metrics.filter((m) => !m.isPrimary), []);

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
              <h1 className="text-white text-xl font-bold">AI 测量结果</h1>
              <p className="text-violet-100 text-xs mt-0.5">患者 {aiMeasurementResult.patientName} · {aiMeasurementResult.checkType}位</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/image-annotation?id=${imageId}`)}
            className="px-3.5 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <i className="ri-refresh-line text-sm"></i>
            重新分析
          </button>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 影像可视化区域 */}
        <div className="relative bg-black overflow-hidden" style={{ height: '42vh' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={fullImage}
              alt="脊柱侧位 X 光"
              className="max-h-full object-contain"
            />

            {/* 标注叠加层 */}
            <div className="absolute inset-0 pointer-events-none">
              {/* SVA 铅垂线（C7 → S1） */}
              <div className="absolute top-[14%] bottom-[24%] left-1/2 border-l-2 border-dashed" style={{ borderColor: '#06b6d4' }}></div>

              {/* C7 点 */}
              <div className="absolute top-[14%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-200/60"></span>
                <span className="mt-1 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap" style={{ backgroundColor: 'rgba(6,182,212,0.9)' }}>C7</span>
              </div>

              {/* 顶椎点 */}
              <div className="absolute top-[40%] left-[44%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-rose-200/60" style={{ backgroundColor: '#f43f5e' }}></span>
                <span className="mt-1 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap" style={{ backgroundColor: 'rgba(244,63,94,0.9)' }}>顶椎</span>
              </div>

              {/* S1 点 */}
              <div className="absolute top-[66%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-amber-200/60" style={{ backgroundColor: '#f59e0b' }}></span>
                <span className="mt-1 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap" style={{ backgroundColor: 'rgba(245,158,11,0.9)' }}>S1</span>
              </div>

              {/* 股骨头中心双点 */}
              <div className="absolute top-[76%] left-[45%] -translate-x-1/2 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-emerald-200/60" style={{ backgroundColor: '#10b981' }}></span>
              </div>
              <div className="absolute top-[76%] left-[55%] -translate-x-1/2 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-emerald-200/60" style={{ backgroundColor: '#10b981' }}></span>
                <span className="mt-1 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap" style={{ backgroundColor: 'rgba(16,185,129,0.9)' }}>股骨头</span>
              </div>

              {/* 骨盆轴线（PT/SS 参考） */}
              <div
                className="absolute h-0.5 rounded-full"
                style={{
                  backgroundColor: '#8b5cf6',
                  top: '71%',
                  left: '41%',
                  width: '120px',
                  transform: 'rotate(12deg)',
                  transformOrigin: 'left center',
                }}
              ></div>

              {/* 水平参考线（SS） */}
              <div className="absolute top-[66%] left-[38%] right-[42%] border-t border-dashed" style={{ borderColor: 'rgba(139,92,246,0.7)' }}></div>
            </div>
          </div>

          {/* AI 置信度标签 */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-1.5">
            <i className="ri-sparkling-2-fill text-violet-400 text-sm"></i>
            <span className="text-white text-xs font-medium">{aiMeasurementResult.aiModel}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span className="text-emerald-400 text-xs font-semibold">置信度 {aiMeasurementResult.confidence}%</span>
          </div>

          {/* 分析时间 */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-1.5">
            <i className="ri-time-line text-gray-400 text-xs"></i>
            <span className="text-gray-300 text-xs">分析于 {aiMeasurementResult.analyzedAt}</span>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-focus-3-line text-violet-600 text-sm"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-800">核心指标</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {primaryMetrics.map((metric) => {
              const status = statusMap[metric.status];
              return (
                <div key={metric.id} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: metric.color }}>{metric.abbr}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">{metric.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-800">{metric.value}</span>
                    <span className="text-sm text-slate-400">{metric.unit}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <i className="ri-information-line text-slate-300 text-xs"></i>
                    <span className="text-[10px] text-slate-400">参考 {metric.reference}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 全部指标列表 */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-list-check text-violet-600 text-sm"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-800">全部指标</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 divide-y divide-slate-50">
            {detailMetrics.map((metric) => {
              const status = statusMap[metric.status];
              return (
                <div key={metric.id} className="p-4 flex items-center">
                  <span className="w-3 h-3 rounded-full flex-shrink-0 mr-3" style={{ backgroundColor: metric.color }}></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{metric.name}</span>
                      <span className="text-xs text-slate-400">{metric.abbr}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{metric.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-lg font-bold text-slate-800">{metric.value}</span>
                      <span className="text-xs text-slate-400">{metric.unit}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-slate-400">参考 {metric.reference}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-4 py-3 flex gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/image-annotation?id=${imageId}`)}
          className="flex-1 py-3 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <i className="ri-pencil-ruler-2-line text-base"></i>
          手动标注
        </button>
        <button
          onClick={() => navigate(`/report/${imageId}`)}
          className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <i className="ri-file-text-line text-base"></i>
          生成报告
        </button>
      </div>

    </div>
  );
}
