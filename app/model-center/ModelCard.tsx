
'use client';

interface ModelCardProps {
  model: {
    id: string;
    title: string;
    description: string;
    icon: string;
    status: string;
    accuracy: string;
    lastUpdated: string;
    category: string;
  };
}

export default function ModelCard({ model }: ModelCardProps) {
  const handleModelClick = () => {
    // 后期可以跳转到具体模型操作页
    console.log(`点击了模型: ${model.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '运行中':
        return 'bg-green-100 text-green-800';
      case '已停止':
        return 'bg-red-100 text-red-800';
      case '训练中':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      onClick={handleModelClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <i className={`${model.icon} text-blue-600 w-6 h-6 flex items-center justify-center`}></i>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
          {model.status}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {model.title}
      </h3>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {model.description}
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">分类</span>
          <span className="text-gray-700 text-sm">{model.category}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">更新时间</span>
          <span className="text-gray-700 text-sm">{model.lastUpdated}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
            <span>查看详情</span>
            <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          
          <div className="flex items-center space-x-2">
            <button className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors">
              <i className="ri-settings-line w-4 h-4 flex items-center justify-center"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
