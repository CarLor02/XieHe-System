import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { imagesData } from '../../../mocks/images';
import ToolTooltip from '../../image-annotation/components/ToolTooltip';

// 大图（详情查看器用，竖屏高分辨率），按检查类型区分
const fullImageByType: Record<string, string> = {
  '正面': 'https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20full%20body%20frontal%20AP%20view%20showing%20complete%20vertebral%20column%20from%20cervical%20to%20sacrum%20with%20clear%20vertebrae%20and%20ribs%20on%20dark%20black%20background%20professional%20radiology%20diagnostic%20image%20high%20contrast%20sharp%20detail&width=600&height=800&seq=detail_front_01&orientation=portrait',
  '侧面': 'https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20lateral%20side%20view%20showing%20sagittal%20profile%20of%20cervical%20thoracic%20lumbar%20vertebral%20column%20with%20natural%20spinal%20curves%20on%20dark%20black%20background%20professional%20radiology%20diagnostic%20image%20high%20contrast%20sharp%20detail&width=600&height=800&seq=detail_lateral_01&orientation=portrait',
  '左侧曲位': 'https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20left%20bending%20view%20scoliosis%20flexibility%20assessment%20lateral%20bending%20vertebral%20column%20curved%20toward%20left%20side%20on%20dark%20black%20background%20professional%20radiology%20diagnostic%20image%20high%20contrast&width=600&height=800&seq=detail_leftbend_01&orientation=portrait',
  '右侧曲位': 'https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20right%20bending%20view%20scoliosis%20flexibility%20assessment%20lateral%20bending%20vertebral%20column%20curved%20toward%20right%20side%20on%20dark%20black%20background%20professional%20radiology%20diagnostic%20image%20high%20contrast&width=600&height=800&seq=detail_rightbend_01&orientation=portrait',
};

function getTypeStyle(type: string) {
  switch (type) {
    case '正面': return { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' };
    case '侧面': return { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-400' };
    case '左侧曲位': return { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-400' };
    case '右侧曲位': return { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' };
  }
}

export default function ImageDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const imageId = id || 'IMG001';

  const imageRecord = useMemo(() => imagesData.find((img) => img.id === imageId) || imagesData[0], [imageId]);

  const [zoom, setZoom] = useState(100);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [toast, setToast] = useState('');

  const typeStyle = getTypeStyle(imageRecord.checkType);
  const fullImage = fullImageByType[imageRecord.checkType] || fullImageByType['正面'];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const zoomIn = () => setZoom((z) => Math.min(300, z + 20));
  const zoomOut = () => setZoom((z) => Math.max(50, z - 20));
  const resetView = () => {
    setZoom(100);
    setFlipH(false);
    setFlipV(false);
  };

  const infoItems = [
    { label: '文件名', value: imageRecord.fileName },
    { label: '患者姓名', value: imageRecord.patientName },
    { label: '患者ID', value: imageRecord.patientId },
    { label: '检查类型', value: imageRecord.checkType, isTag: true },
    { label: '上传时间', value: imageRecord.uploadTime },
    { label: '影像尺寸', value: '2560 × 3413 px' },
    { label: '文件大小', value: '4.2 MB' },
    { label: '设备', value: 'GE Optima XR646' },
  ];

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
              <h1 className="text-white text-xl font-bold">影像详情</h1>
              <p className="text-violet-100 text-xs mt-0.5">影像ID: {imageRecord.id}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/image-annotation?id=${imageRecord.id}`)}
            className="px-3.5 py-2 bg-white text-violet-600 text-xs font-semibold rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <i className="ri-magic-line text-sm"></i>
            去标注
          </button>
        </div>
      </div>

      {/* 大图查看区域 */}
      <div className="relative bg-black overflow-hidden" style={{ height: '46vh' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={fullImage}
            alt={imageRecord.checkType}
            className="max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${(flipH ? -1 : 1) * (zoom / 100)}, ${(flipV ? -1 : 1) * (zoom / 100)})`,
            }}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* 右上角工具：翻转 / 重置 */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <ToolTooltip tooltip="水平翻转\n左右镜像显示影像，方便从不同角度观察脊柱结构">
            <button
              onClick={() => setFlipH((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
                flipH ? 'bg-violet-500 text-white' : 'bg-gray-800/80 text-gray-200'
              }`}
            >
              <i className="ri-swap-line text-lg"></i>
            </button>
          </ToolTooltip>
          <ToolTooltip tooltip="垂直翻转\n上下镜像显示影像">
            <button
              onClick={() => setFlipV((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
                flipV ? 'bg-violet-500 text-white' : 'bg-gray-800/80 text-gray-200'
              }`}
            >
              <i className="ri-arrow-up-down-line text-lg"></i>
            </button>
          </ToolTooltip>
          <ToolTooltip tooltip="重置视图\n恢复缩放与翻转到初始状态">
            <button
              onClick={resetView}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-200 transition-all active:scale-95"
            >
              <i className="ri-refresh-line text-lg"></i>
            </button>
          </ToolTooltip>
        </div>

        {/* 左下角缩放控件 */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm rounded-xl px-2 py-1.5">
          <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center rounded-lg text-white active:bg-gray-700">
            <i className="ri-subtract-line"></i>
          </button>
          <span className="text-white text-xs font-medium w-12 text-center">{zoom}%</span>
          <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center rounded-lg text-white active:bg-gray-700">
            <i className="ri-add-line"></i>
          </button>
        </div>

        {/* 右下角类型标记 */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${typeStyle.bg} ${typeStyle.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${typeStyle.dot}`}></span>
            {imageRecord.checkType}
          </span>
        </div>
      </div>

      {/* 底部信息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center bg-violet-50 rounded-lg">
              <i className="ri-information-line text-violet-600 text-sm"></i>
            </div>
            <h2 className="text-sm font-bold text-slate-800">基本信息</h2>
            <span className={`ml-auto px-2.5 py-1 text-[10px] font-semibold rounded-full ${
              imageRecord.status === '已上传' ? 'bg-emerald-50 text-emerald-600' :
              imageRecord.status === '处理中' ? 'bg-amber-50 text-amber-600' :
              'bg-slate-50 text-slate-600'
            }`}>
              {imageRecord.status}
            </span>
          </div>
          <div className="space-y-0 divide-y divide-slate-50">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center py-2.5">
                <span className="w-20 text-xs text-slate-400 flex-shrink-0">{item.label}</span>
                {item.isTag ? (
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${typeStyle.bg} ${typeStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${typeStyle.dot}`}></span>
                    {item.value}
                  </span>
                ) : (
                  <span className="flex-1 text-sm text-slate-700 truncate text-right">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI 测量结果入口 */}
        <button
          onClick={() => navigate(`/ai-measurement/${imageRecord.id}`)}
          className="w-full bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center gap-3 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-400/30 flex-shrink-0">
            <i className="ri-magic-line text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">AI 测量结果</h3>
            <p className="text-xs text-slate-400 mt-0.5">查看 Cobb 角、SVA、PI 等自动测量指标</p>
          </div>
          <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full">
            <i className="ri-arrow-right-line text-slate-400"></i>
          </div>
        </button>

        {/* 底部操作按钮 */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate(`/image-annotation?id=${imageRecord.id}`)}
            className="flex-1 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-magic-line text-base"></i>
            去标注分析
          </button>
          <button
            onClick={() => showToast('已加入下载队列')}
            className="px-5 py-3.5 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-download-2-line text-base"></i>
            下载
          </button>
        </div>
      </div>

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