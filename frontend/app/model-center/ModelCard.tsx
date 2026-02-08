
'use client';

interface ModelCardProps {
  model: {
    id: string;
    title: string;
    description: string;
    icon: string;
    status: string;
    view_type: string;
    isActive?: boolean;
    is_system_default?: boolean;
    can_delete?: boolean;
    accuracy: string;
    lastUpdated: string;
    category: string;
    endpoint_url?: string;
  };
  onActivateClick: (model: any) => void;
  onDeleteClick: (model: any) => void;
}

export default function ModelCard({ model, onActivateClick, onDeleteClick }: ModelCardProps) {

  const getViewTypeLabel = (type: string) => {
    switch (type) {
      case 'front': return '正面';
      case 'side': return '侧面';
      case 'other': return '其他';
      default: return type;
    }
  };

  const getViewTypeColor = (type: string) => {
    switch (type) {
      case 'front': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'side': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ready':
        return { label: '就绪', color: 'bg-green-500', textColor: 'text-green-700' };
      case 'error':
        return { label: '错误', color: 'bg-red-500', textColor: 'text-red-700' };
      case 'stopped':
        return { label: '离线', color: 'bg-gray-400', textColor: 'text-gray-700' };
      case 'training':
        return { label: '训练中', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
      default:
        return { label: '未知', color: 'bg-gray-400', textColor: 'text-gray-700' };
    }
  };

  const statusInfo = getStatusDisplay(model.status);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow group relative">

      {/* Badges */}
      <div className="absolute top-0 right-0 mt-4 mr-4 flex flex-col items-end gap-2">
        {model.is_system_default && (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            系统默认
          </span>
        )}
        {model.isActive && (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <i className="ri-check-line"></i>
            <span>当前使用中</span>
          </span>
        )}
      </div>

      <div className="flex items-start mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mr-4 border border-gray-100">
          {model.view_type === 'front' ? <i className="ri-body-scan-line text-blue-500 text-2xl"></i> :
            model.view_type === 'side' ? <i className="ri-file-user-line text-purple-500 text-2xl"></i> :
              <i className="ri-cpu-line text-gray-500 text-2xl"></i>}
        </div>
        <div>
          <span className={`inline-block px-2 py-0.5 rounded text-xs border mb-1 ${getViewTypeColor(model.view_type)}`}>
            {getViewTypeLabel(model.view_type)}
          </span>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={model.title}>
            {model.title}
          </h3>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
        {model.description || "暂无描述"}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">状态</span>
          <span className={`${statusInfo.textColor} flex items-center font-medium`}>
            <span className={`w-2 h-2 rounded-full ${statusInfo.color} mr-2`}></span>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">更新时间</span>
          <span className="text-gray-700">{model.lastUpdated}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
        {/* 激活按钮（非激活状态时显示） */}
        {!model.isActive && (
          <button
            onClick={() => onActivateClick(model)}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-md text-sm font-medium transition-colors"
          >
            切换使用
          </button>
        )}

        {/* 已激活状态 */}
        {model.isActive && (
          <div className="flex-1 bg-green-50 text-green-700 py-2 rounded-md text-sm font-medium text-center">
            ✓ 当前使用中
          </div>
        )}

        {/* 删除按钮（仅用户自定义模型显示） */}
        {model.can_delete && (
          <button
            onClick={() => onDeleteClick(model)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
