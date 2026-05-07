interface ImageEmptyStateProps {
  hasActiveFilters: boolean;
  onClearResultFilters: () => void;
}

export default function ImageEmptyState({
  hasActiveFilters,
  onClearResultFilters,
}: ImageEmptyStateProps) {
  return (
    <div className="p-12 text-center text-gray-400">
      {hasActiveFilters ? (
        <>
          <i className="ri-search-line w-16 h-16 flex items-center justify-center mx-auto mb-4 text-4xl"></i>
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            未找到匹配的影像
          </h3>
          <p className="text-gray-400 mb-4">请尝试调整搜索条件或筛选器</p>
          <button
            onClick={onClearResultFilters}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-refresh-line"></i>
            <span>清除筛选条件</span>
          </button>
        </>
      ) : (
        <>
          <i className="ri-image-add-line w-16 h-16 flex items-center justify-center mx-auto mb-4 text-4xl"></i>
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            还没有上传任何影像
          </h3>
          <p className="text-gray-400">开始上传您的第一张医疗影像吧</p>
        </>
      )}
    </div>
  );
}
