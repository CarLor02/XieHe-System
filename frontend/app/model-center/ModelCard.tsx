
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
    accuracy: string;
    lastUpdated: string;
    category: string;
    endpoint_url?: string;
  };
  onTestClick: (model: any) => void;
}

export default function ModelCard({ model, onTestClick }: ModelCardProps) {

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow group relative">

      {/* Active Badge */}
      {model.isActive && (
        <div className="absolute top-0 right-0 mt-4 mr-4">
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <i className="ri-check-line"></i>
            <span>当前使用中</span>
          </span>
        </div>
      )}

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
          <span className="text-gray-700 flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            就绪
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">更新时间</span>
          <span className="text-gray-700">{model.lastUpdated}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center space-x-3">
        <button
          onClick={() => onTestClick(model)}
          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
        >
          <i className="ri-flask-line mr-1"></i>
          测试模型
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
          <i className="ri-settings-3-line text-lg"></i>
        </button>
      </div>
    </div>
  );
}
