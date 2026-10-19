
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { annotationData } from '../../mocks/annotations';
import { imagesData } from '../../mocks/images';
import ToolTooltip from './components/ToolTooltip';
import Toast from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

type ViewMode = 'front' | 'lateral';
type BasicMode = 'move' | 'zoom';

export default function ImageAnnotationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get('id') || 'IMG001';

  // 根据影像 checkType 决定视图模式，且锁定不可切换
  const imageRecord = useMemo(() => imagesData.find(img => img.id === imageId), [imageId]);
  const initialViewMode: ViewMode = imageRecord?.checkType === '侧面' ? 'lateral' : 'front';

  const [showMeasurePanel, setShowMeasurePanel] = useState(true);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [imageSettings] = useState(annotationData.imageSettings);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode] = useState<ViewMode>(initialViewMode);
  const [basicMode, setBasicMode] = useState<BasicMode>('move');
  const [imageLocked, setImageLocked] = useState(false);
  // 图上参数标签是否显示
  const [showAnnotations, setShowAnnotations] = useState(true);
  // 沉浸式全屏（隐藏面板与底部操作栏）
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmType, setConfirmType] = useState<'complete' | 'clear' | null>(null);

  const currentTools = viewMode === 'front' ? annotationData.frontTools : annotationData.lateralTools;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-violet-700 fixed top-0 left-0 right-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full"
            >
              <i className="ri-arrow-left-line text-white text-lg"></i>
            </button>
            <div>
              <h1 className="text-white font-semibold text-base">影像标注</h1>
              <p className="text-white/70 text-xs">影像ID: {imageId} | 患者: {annotationData.patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToolTooltip tooltip={'保存标注\n保存当前所有测量与标注，不离开当前页面'} placement="bottom-end">
              <button
                onClick={() => showToast('影像标注已保存')}
                className="px-3 py-1.5 bg-white/20 rounded-lg text-white text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                <i className="ri-save-line"></i>
                保存
              </button>
            </ToolTooltip>
            <ToolTooltip tooltip={'完成标注\n保存本次标注并返回影像详情'} placement="bottom-end">
              <button
                onClick={() => setConfirmType('complete')}
                className="px-3 py-1.5 bg-emerald-500 rounded-lg text-white text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                <i className="ri-check-line"></i>
                完成
              </button>
            </ToolTooltip>
          </div>
        </div>
        {/* 当前视图类型（按影像 checkType 直接显示，不可切换） */}
        <div className="px-4 pb-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-md">
            <i className={`${viewMode === 'front' ? 'ri-image-line' : 'ri-image-2-line'} text-violet-700 text-xs`}></i>
            <span className="text-violet-700 text-xs font-semibold">
              {viewMode === 'front' ? '正面' : '侧面'}
            </span>
          </div>
          <span className="text-white/45 text-[10px]">
            当前影像类型不可切换
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 pt-24 pb-14 flex flex-col">
        {/* 影像查看区域 */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ filter: `contrast(${imageSettings.contrast}%) brightness(${100 + imageSettings.brightness}%)` }}
          >
            <img 
              src={viewMode === 'front'
                ? "https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20full%20body%20frontal%20AP%20view%20showing%20vertebral%20column%20with%20measurement%20lines%20and%20angle%20markers%20on%20dark%20background%20professional%20radiology%20image%20high%20contrast%20medical%20diagnostic%20quality&width=300&height=450&seq=spine_front_view_01&orientation=portrait"
                : "https://readdy.ai/api/search-image?query=medical%20X-ray%20spine%20lateral%20side%20view%20showing%20cervical%20thoracic%20lumbar%20vertebral%20column%20sagittal%20profile%20on%20dark%20background%20professional%20radiology%20image%20high%20contrast%20medical%20diagnostic%20quality&width=300&height=450&seq=spine_lateral_view_01&orientation=portrait"
              }
              alt={viewMode === 'front' ? '脊柱正位X光片' : '脊柱侧位X光片'}
              className="max-h-full object-contain"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            />
            
            {/* 标注叠加层 */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${showAnnotations ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute top-[15%] left-[calc(50%-32px)] transform -translate-x-1/2">
                <div className="bg-cyan-500/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap">TS: 11.4mm</div>
                <div className="border-t-2 border-dashed border-cyan-400 w-20 mt-1"></div>
              </div>
              <div className="absolute top-[22%] left-[calc(50%-32px)] transform -translate-x-1/2">
                <div className="bg-green-500/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap">RSH: 辅助标记</div>
              </div>
              <div className="absolute top-[38%] left-[calc(35%-32px)]">
                <div className="bg-green-500/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap mb-1">AVT: 12.9mm</div>
                <div className="bg-green-600/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap">Cobb: 辅助标记</div>
              </div>
              <div className="absolute bottom-[18%] left-[calc(50%-32px)] transform -translate-x-1/2">
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-green-500/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap">Pelvic: 0.4°</div>
                  <div className="bg-green-500/80 px-1.5 py-0.5 rounded text-white text-[10px] leading-tight whitespace-nowrap">Sacral: 1.3°</div>
                </div>
              </div>
              <div className="absolute top-[20%] bottom-[20%] left-1/2 border-l-2 border-dashed border-green-400/60"></div>
            </div>
          </div>

          {/* 缩放控制 */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-gray-800/80 rounded-lg px-3 py-2">
            <button onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} className="w-7 h-7 flex items-center justify-center bg-gray-700 rounded text-white">
              <i className="ri-subtract-line"></i>
            </button>
            <span className="text-white text-xs w-12 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))} className="w-7 h-7 flex items-center justify-center bg-gray-700 rounded text-white">
              <i className="ri-add-line"></i>
            </button>
          </div>

          {/* 快捷操作按钮 */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {[
              {
                icon: showAnnotations ? 'ri-eye-line' : 'ri-eye-off-line',
                label: showAnnotations ? '隐藏参数' : '显示参数',
                tip: showAnnotations
                  ? '隐藏参数\n关闭图上所有测量参数标签的显示'
                  : '显示参数\n重新显示图上已标注的测量参数',
                active: showAnnotations,
                onClick: () => setShowAnnotations(v => !v),
              },
              {
                icon: 'ri-ruler-2-line',
                label: '测量数据',
                tip: '测量数据\n展开或收起底部的测量数值列表',
                active: showMeasurePanel,
                onClick: () => setShowMeasurePanel(!showMeasurePanel),
              },
              {
                icon: 'ri-tools-line',
                label: '工具面板',
                tip: '工具面板\n展开标注工具，选择测量类型与辅助图形',
                active: showToolPanel,
                onClick: () => setShowToolPanel(!showToolPanel),
              },
              {
                icon: isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line',
                label: isFullscreen ? '退出全屏' : '全屏查看',
                tip: isFullscreen
                  ? '退出全屏\n恢复面板与底部操作栏'
                  : '全屏查看\n隐藏面板，让影像占满整个屏幕',
                active: isFullscreen,
                onClick: () => setIsFullscreen(v => !v),
              },
              {
                icon: 'ri-refresh-line',
                label: '重置视图',
                tip: '重置视图\n缩放恢复到 100%，并收起工具面板',
                active: false,
                onClick: () => {
                  setZoomLevel(100);
                  setShowToolPanel(false);
                  showToast('视图已重置');
                },
              },
            ].map((btn) => (
              <ToolTooltip key={btn.label} tooltip={btn.tip} placement="left">
                <button
                  onClick={btn.onClick}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg ${btn.active ? 'bg-violet-500' : 'bg-gray-800/80'} text-white transition-all active:scale-95`}
                >
                  <i className={`${btn.icon} text-lg`}></i>
                </button>
              </ToolTooltip>
            ))}
          </div>
        </div>

        {/* 测量数据面板 */}
        {!isFullscreen && showMeasurePanel && (
          <div className="bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <i className="ri-list-check text-violet-400"></i>
                <span className="text-white text-sm font-medium">测量数据</span>
              </div>
              <button onClick={() => setShowMeasurePanel(false)} className="w-6 h-6 flex items-center justify-center text-gray-400">
                <i className="ri-arrow-down-s-line"></i>
              </button>
            </div>
            <div className="px-4 py-3 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {annotationData.measurements.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-white text-xs">{item.type}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 工具面板 */}
        {!isFullscreen && showToolPanel && (
          <div className="bg-[#1a1d2e] border-t border-gray-700/60">
            {/* 面板标题栏 */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-700/60">
              <div className="flex items-center gap-2">
                <i className="ri-tools-line text-violet-400 text-sm"></i>
                <span className="text-white text-sm font-medium">标注工具</span>
              </div>
              <button onClick={() => setShowToolPanel(false)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <i className="ri-arrow-down-s-line text-lg"></i>
              </button>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* 侧面专属：基础模式 */}
              {viewMode === 'lateral' && (
                <div>
                  <span className="text-gray-400 text-xs mb-2 block">基础模式</span>
                  <div className="flex gap-2">
                    {([
                      { key: 'move', label: '移动', icon: 'ri-drag-move-line' },
                      { key: 'zoom', label: '缩放', icon: 'ri-zoom-in-line' },
                    ] as { key: BasicMode; label: string; icon: string }[]).map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setBasicMode(m.key)}
                        className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 px-4 rounded-xl transition-all active:scale-95 ${
                          basicMode === m.key
                            ? 'bg-blue-500 shadow-lg shadow-blue-900/50'
                            : 'bg-[#22263a] hover:bg-[#2a2f45]'
                        }`}
                      >
                        {basicMode === m.key && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                            <i className="ri-check-line text-blue-500" style={{ fontSize: '8px' }}></i>
                          </div>
                        )}
                        <i className={`${m.icon} text-base ${basicMode === m.key ? 'text-white' : 'text-gray-300'}`}></i>
                        <span className={`text-[11px] ${basicMode === m.key ? 'text-white' : 'text-gray-400'}`}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 侧面专属：锁定图像 */}
              {viewMode === 'lateral' && (
                <button
                  onClick={() => setImageLocked(v => !v)}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98] ${
                    imageLocked
                      ? 'bg-[#2a2f45] border border-violet-500/50 text-violet-300'
                      : 'bg-[#22263a] hover:bg-[#2a2f45] text-gray-300'
                  }`}
                >
                  <i className={`${imageLocked ? 'ri-lock-fill text-violet-400' : 'ri-lock-unlock-line'} text-base`}></i>
                  {imageLocked ? '已锁定图像' : '锁定图像'}
                </button>
              )}

              {/* 共享点位绑定面板 */}
              <div className="bg-[#22263a] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-links-line text-amber-400 text-sm"></i>
                    </div>
                    <span className="text-gray-200 text-xs font-medium">共享点位绑定面板</span>
                  </div>
                  <i className="ri-arrow-down-s-line text-gray-500 text-sm"></i>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => showToast('已解除全部共享点位绑定')}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#2a2f45] hover:bg-[#323754] rounded-lg text-gray-300 text-xs transition-colors active:scale-95"
                  >
                    <i className="ri-scissors-cut-line text-sm"></i>
                    解除全部绑定
                  </button>
                  <button
                    onClick={() => showToast('请先在影像上点选需要绑定的点位')}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#2a2f45] hover:bg-[#323754] rounded-lg text-gray-300 text-xs transition-colors active:scale-95"
                  >
                    <i className="ri-cursor-line text-sm"></i>
                    手动绑定
                  </button>
                </div>
              </div>

              {/* 测量标注 */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-ruler-2-line text-gray-400 text-sm"></i>
                  </div>
                  <span className="text-gray-300 text-xs font-medium">测量标注</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {currentTools.map((tool) => (
                    <ToolTooltip key={tool.id} tooltip={(tool as { tooltip?: string }).tooltip || tool.name}>
                      <button
                        onClick={() => setSelectedTool(tool.id)}
                        className={`relative w-full flex flex-col items-center gap-1.5 pt-3 pb-2.5 px-1 rounded-xl transition-all active:scale-95 ${
                          selectedTool === tool.id
                            ? 'bg-violet-600 shadow-lg shadow-violet-900/50'
                            : 'bg-[#22263a] hover:bg-[#2a2f45]'
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center">
                          <i className={`${tool.icon} text-lg ${selectedTool === tool.id ? 'text-white' : 'text-gray-300'}`}></i>
                        </div>
                        <span className={`text-[11px] leading-tight text-center w-full px-0.5 overflow-hidden whitespace-nowrap text-ellipsis ${selectedTool === tool.id ? 'text-white' : 'text-gray-400'}`}>
                          {tool.name}
                        </span>
                        {(tool as { count?: number }).count !== undefined && (
                          <div className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            selectedTool === tool.id ? 'bg-white/30 text-white' : 'bg-[#3a3f58] text-gray-400'
                          }`}>
                            {(tool as { count?: number }).count}
                          </div>
                        )}
                      </button>
                    </ToolTooltip>
                  ))}
                </div>
              </div>

              {/* 辅助图形 */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-shape-2-line text-gray-400 text-sm"></i>
                  </div>
                  <span className="text-gray-300 text-xs font-medium">辅助图形</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {annotationData.shapes.map((shape) => (
                    <ToolTooltip key={shape.id} tooltip={(shape as { tooltip?: string }).tooltip || shape.name}>
                      <button
                        onClick={() => setSelectedTool(shape.id)}
                        className={`relative w-full flex flex-col items-center gap-1.5 pt-3 pb-2.5 px-1 rounded-xl transition-all active:scale-95 ${
                          selectedTool === shape.id
                            ? 'bg-violet-600 shadow-lg shadow-violet-900/50'
                            : 'bg-[#22263a] hover:bg-[#2a2f45]'
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center">
                          <i className={`${shape.icon} text-lg ${selectedTool === shape.id ? 'text-white' : 'text-gray-300'}`}></i>
                        </div>
                        <span className={`text-[11px] leading-tight text-center w-full px-0.5 overflow-hidden whitespace-nowrap text-ellipsis ${selectedTool === shape.id ? 'text-white' : 'text-gray-400'}`}>
                          {shape.name}
                        </span>
                        {(shape as { count?: number }).count !== undefined && (
                          <div className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            selectedTool === shape.id ? 'bg-white/30 text-white' : 'bg-[#3a3f58] text-gray-400'
                          }`}>
                            {(shape as { count?: number }).count}
                          </div>
                        )}
                      </button>
                    </ToolTooltip>
                  ))}
                </div>
              </div>

              {/* 标准距离设置 */}
              <div>
                <button
                  onClick={() => showToast(`标准距离已设为 ${imageSettings.standardDistance}mm`)}
                  className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-lg shadow-violet-900/40"
                >
                  <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-md">
                    <i className="ri-pencil-ruler-2-line text-xs"></i>
                  </div>
                  标准距离设置
                </button>
                <div className="mt-2.5 px-1">
                  <p className="text-gray-400 text-[10px] mb-1.5">标准距离值 (mm)</p>
                  <div className="bg-[#22263a] rounded-lg px-3 py-2 border border-gray-700/50">
                    <input
                      type="number"
                      placeholder="例如：100"
                      className="w-full bg-transparent text-white text-xs outline-none placeholder-gray-600"
                      defaultValue={imageSettings.standardDistance}
                    />
                  </div>
                  <p className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1">
                    <i className="ri-check-line"></i>
                    已设置: {imageSettings.standardDistance}mm
                  </p>
                </div>
              </div>

              {/* 标签管理 & 治疗建议 */}
              <div className="space-y-2.5 pb-1">
                <button
                  onClick={() => showToast('标签管理面板开发中')}
                  className="w-full py-3 bg-[#16a34a] hover:bg-[#15803d] rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-lg shadow-green-900/40"
                >
                  <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-md">
                    <i className="ri-price-tag-3-line text-xs"></i>
                  </div>
                  标签管理
                </button>
                <button
                  onClick={() => showToast('治疗建议面板开发中')}
                  className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-lg shadow-orange-900/40"
                >
                  <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-md">
                    <i className="ri-file-list-3-line text-xs"></i>
                  </div>
                  治疗建议
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {!isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-lg border-t border-gray-700 px-4 py-2 flex items-center justify-between z-50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setBasicMode('move'); showToast('已切换到移动模式'); }}
              className={`px-3 py-2 flex flex-col items-center rounded-lg transition-colors ${basicMode === 'move' ? 'bg-gray-700/60' : ''}`}
            >
              <i className={`ri-drag-move-line text-lg ${basicMode === 'move' ? 'text-violet-300' : 'text-gray-400'}`}></i>
              <span className={`text-[10px] ${basicMode === 'move' ? 'text-violet-300' : 'text-gray-400'}`}>移动</span>
            </button>
            <button
              onClick={() => { setBasicMode('zoom'); showToast('已切换到缩放模式'); }}
              className={`px-3 py-2 flex flex-col items-center rounded-lg transition-colors ${basicMode === 'zoom' ? 'bg-gray-700/60' : ''}`}
            >
              <i className={`ri-zoom-in-line text-lg ${basicMode === 'zoom' ? 'text-violet-300' : 'text-gray-400'}`}></i>
              <span className={`text-[10px] ${basicMode === 'zoom' ? 'text-violet-300' : 'text-gray-400'}`}>缩放</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => showToast('已撤销上一步操作')} className="px-3 py-2 flex flex-col items-center active:scale-95">
              <i className="ri-arrow-go-back-line text-gray-400 text-lg"></i>
              <span className="text-gray-400 text-[10px]">撤销</span>
            </button>
            <button onClick={() => showToast('已重做上一步操作')} className="px-3 py-2 flex flex-col items-center active:scale-95">
              <i className="ri-arrow-go-forward-line text-gray-400 text-lg"></i>
              <span className="text-gray-400 text-[10px]">重做</span>
            </button>
            <button onClick={() => setConfirmType('clear')} className="px-3 py-2 flex flex-col items-center active:scale-95">
              <i className="ri-delete-bin-line text-red-400 text-lg"></i>
              <span className="text-red-400 text-[10px]">清除</span>
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />

      <ConfirmDialog
        open={confirmType !== null}
        title={confirmType === 'complete' ? '完成本次标注？' : '清除全部标注？'}
        description={
          confirmType === 'complete'
            ? '当前所有测量数据与辅助图形将被保存，并返回影像详情。'
            : '该影像上的全部测量数据与辅助图形将被清除，此操作不可撤销。'
        }
        confirmText={confirmType === 'complete' ? '完成标注' : '确认清除'}
        danger={confirmType === 'clear'}
        onConfirm={() => {
          if (confirmType === 'complete') {
            showToast('标注已完成，正在返回…');
            setTimeout(() => navigate(-1), 700);
          } else if (confirmType === 'clear') {
            setSelectedTool(null);
            showToast('已清除当前标注');
          }
          setConfirmType(null);
        }}
        onCancel={() => setConfirmType(null)}
      />
    </div>
  );
}
