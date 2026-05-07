interface ImagePaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  onChangePage: (updater: (page: number) => number) => void;
}

export default function ImagePagination({
  total,
  pageSize,
  currentPage,
  onChangePage,
}: ImagePaginationProps) {
  if (total <= pageSize) return null;

  return (
    <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
      <div className="text-sm text-gray-700">
        显示{' '}
        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{' '}
        到{' '}
        <span className="font-medium">
          {Math.min(currentPage * pageSize, total)}
        </span>{' '}
        条， 共 <span className="font-medium">{total}</span> 条
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onChangePage(page => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          上一页
        </button>
        <button
          onClick={() => onChangePage(page => page + 1)}
          disabled={currentPage * pageSize >= total}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
