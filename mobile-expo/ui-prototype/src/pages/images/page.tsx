import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { imagesData } from '../../mocks/images';
import EmptyState from '@/components/base/EmptyState';
import PageHeader from '@/components/feature/PageHeader';
import SearchBar from '@/components/base/SearchBar';
import FilterSheet from '@/components/feature/FilterSheet';
import BottomTabBar from '@/components/feature/BottomTabBar';
import StatusTag, { type StatusTagTone } from '@/components/base/StatusTag';
import Toast from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import ToolTooltip from '@/pages/image-annotation/components/ToolTooltip';

export default function ImagesPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部类型');
  const [statusFilter, setStatusFilter] = useState('全部状态');
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [imageList, setImageList] = useState(imagesData);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileName: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const filteredImages = imageList.filter(image => {
    const matchSearch = image.fileName.includes(searchText) || 
                       image.patientName.includes(searchText) ||
                       image.checkType.includes(searchText);
    const matchType = typeFilter === '全部类型' || image.checkType === typeFilter;
    const matchStatus = statusFilter === '全部状态' || image.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const getTypeStyle = (type: string) => {
    switch(type) {
      case '正面': return { text: 'text-violet-600', fallback: 'bg-violet-100' };
      case '侧面': return { text: 'text-sky-600', fallback: 'bg-sky-100' };
      case '左侧曲位': return { text: 'text-teal-600', fallback: 'bg-teal-100' };
      case '右侧曲位': return { text: 'text-indigo-600', fallback: 'bg-indigo-100' };
      default: return { text: 'text-slate-500', fallback: 'bg-slate-100' };
    }
  };

  const typeTone: Record<string, StatusTagTone> = {
    '正面': 'violet',
    '侧面': 'sky',
    '左侧曲位': 'teal',
    '右侧曲位': 'indigo',
  };

  const statusTone: Record<string, StatusTagTone> = {
    '已上传': 'emerald',
    '处理中': 'amber',
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <PageHeader
        title="影像中心"
        subtitle={`${filteredImages.length} 份影像`}
        right={
          <button 
            onClick={() => navigate('/images/upload')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
          >
            <i className="ri-add-line text-xl"></i>
          </button>
        }
      >
        <SearchBar value={searchText} onChange={setSearchText} placeholder="搜索患者姓名、检查类型或文件名" />
      </PageHeader>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setShowTypeFilter(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              typeFilter !== '全部类型' 
                ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30' 
                : 'bg-white text-slate-600 shadow-sm border border-slate-100'
            }`}
          >
            <i className="ri-file-list-3-line text-sm"></i>
            <span>{typeFilter}</span>
          </button>
          <button
            onClick={() => setShowStatusFilter(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              statusFilter !== '全部状态' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                : 'bg-white text-slate-600 shadow-sm border border-slate-100'
            }`}
          >
            <i className="ri-checkbox-circle-line text-sm"></i>
            <span>{statusFilter}</span>
          </button>
        </div>

        {filteredImages.length === 0 ? (
          <EmptyState
            icon="ri-image-line"
            title="未找到匹配的影像"
            description="试试调整搜索关键词或筛选条件"
            actionText="清除筛选"
            actionIcon="ri-filter-off-line"
            onAction={() => { setSearchText(''); setTypeFilter('全部类型'); setStatusFilter('全部状态'); }}
          />
        ) : (
        <div className="space-y-3">
          {filteredImages.map((image) => (
            <div key={image.id} className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
              <div
                onClick={() => navigate(`/images/detail/${image.id}`)}
                className="flex items-start mb-4 cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="w-14 h-14 rounded-xl mr-3 flex-shrink-0 overflow-hidden bg-black shadow-lg shadow-slate-900/40 border border-slate-700/30 relative">
                  <img
                    src={image.thumbnailUrl}
                    alt={image.checkType}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className={`absolute inset-0 items-center justify-center hidden ${getTypeStyle(image.checkType).fallback}`}>
                    <i className={`ri-scan-line text-xl ${getTypeStyle(image.checkType).text}`}></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 mb-1.5 truncate">{image.fileName}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusTag label={image.checkType} tone={typeTone[image.checkType]} dot />
                    <StatusTag label={image.status} tone={statusTone[image.status]} />
                  </div>
                  <div className="text-xs text-slate-400 flex items-center">
                    <i className="ri-time-line mr-1"></i>
                    {image.uploadTime}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => navigate(`/image-annotation?id=${image.id}`)}
                  className="flex-1 relative overflow-hidden py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-md shadow-violet-400/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></span>
                  <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-lg">
                    <i className="ri-magic-line text-xs"></i>
                  </div>
                  <span>标注分析</span>
                  <i className="ri-arrow-right-line text-xs opacity-70"></i>
                </button>
                <ToolTooltip tooltip={'下载影像\n将原始影像下载到本地设备'}>
                  <button
                    onClick={() => showToast(`已开始下载 ${image.fileName}`)}
                    className="w-11 h-11 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95 flex items-center justify-center border border-slate-100"
                  >
                    <i className="ri-download-2-line text-base"></i>
                  </button>
                </ToolTooltip>
                <ToolTooltip tooltip={'删除影像\n从影像中心移除该影像，删除后可从回收站恢复'}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: image.id, fileName: image.fileName });
                    }}
                    className="w-11 h-11 bg-red-50 text-red-400 rounded-2xl hover:bg-red-100 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center border border-red-50"
                  >
                    <i className="ri-delete-bin-5-line text-base"></i>
                  </button>
                </ToolTooltip>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 类型筛选弹窗 */}
      <FilterSheet
        open={showTypeFilter}
        title="选择检查类型"
        options={['全部类型', '正面', '侧面', '左侧曲位', '右侧曲位']}
        value={typeFilter}
        onSelect={setTypeFilter}
        onClose={() => setShowTypeFilter(false)}
      />

      {/* 状态筛选弹窗 */}
      <FilterSheet
        open={showStatusFilter}
        title="选择状态"
        options={['全部状态', '已上传', '处理中', '已完成']}
        value={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setShowStatusFilter(false)}
      />

      {/* 底部导航栏 */}
      <BottomTabBar />

      <Toast message={toast} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除这份影像？"
        description={deleteTarget ? `《${deleteTarget.fileName}》及其标注数据将被移除，删除后可从回收站恢复。` : ''}
        confirmText="确认删除"
        danger
        onConfirm={() => {
          if (deleteTarget) {
            setImageList(prev => prev.filter(item => item.id !== deleteTarget.id));
            showToast('影像已删除');
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
